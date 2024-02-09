/**
 * AutoMix Library
 * StreetDesign.ai
 * Beyondware.com
 */

import { nanoid } from 'nanoid'

import {
  SegmentTypes,
  getSegmentInfo
} from '../../../assets/scripts/segments/info'
import {
  getVariantArray,
  getVariantString
} from '../../../assets/scripts/segments/variant_utils'
import { recalculateWidth } from '../../../assets/scripts/streets/width'
import SEGMENT_INFO from '../../../assets/scripts/segments/info.json'
import DefaultRules from './automix.rules.mjs'

export default class AutoMix {
  street = null
  rules = DefaultRules

  constructor (street, rules = DefaultRules) {
    this.street = street
    this.rules = rules
  }

  counts () {
    const numDriveLanesInbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'drive-lane' &&
        segment.variantString.includes('inbound')
    ).length

    const numDriveLanesOutbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'drive-lane' &&
        segment.variantString.includes('outbound')
    ).length

    const numBikeLanesInbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'bike-lane' &&
        segment.variantString.includes('inbound')
    ).length

    const numBikeLanesOutbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'bike-lane' &&
        segment.variantString.includes('outbound')
    ).length

    const numBusLanesInbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'bus-lane' && segment.variantString.includes('inbound')
    ).length

    const numBusLanesOutbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'bus-lane' &&
        segment.variantString.includes('outbound')
    ).length

    const numSidewalks = this.street.segments.filter(
      (segment) => segment.type === 'sidewalk'
    ).length

    const numParkingLanesInbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'parking-lane' &&
        segment.variantString.includes('inbound')
    ).length

    const numParkingLanesOutbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'parking-lane' &&
        segment.variantString.includes('outbound')
    ).length

    return {
      numDriveLanesInbound,
      numDriveLanesOutbound,
      numBikeLanesInbound,
      numBikeLanesOutbound,
      numBusLanesInbound,
      numBusLanesOutbound,
      numSidewalks,
      numParkingLanesInbound,
      numParkingLanesOutbound
    }
  }

  /**
   * Returns a hash of the street's segments
   */
  hash (street = this.street) {
    return street.segments
      .map((segment) =>
        [segment.type, segment.variantString, segment.width].join('!')
      )
      .join()
  }

  /**
   * Recalculates the street's remaining and occupied widths
   */
  recalculateWidth () {
    this.street = { ...this.street, ...recalculateWidth(this.street) }
  }

  /**
   * The main AutoMix function
   * Performs mixing operations on the street
   */
  mix (loop = 0) {
    console.time('AutoMix: Mix')
    const types = Object.keys(SEGMENT_INFO)
    const startStreet = { ...this.street }
    const startHash = this.hash()

    this.removeDriveLanes()
    this.removeBikeLanes()
    this.removeParkingLanes()
    this.replaceParkingLanes()
    this.replaceTurnLanes()
    this.removeSidewalks()
    this.removeLamps()

    if (
      (Math.random() > 1 - this.rules.chances.shrinkLamps ?? 0.8) ||
      this.street.remainingWidth < 4
    ) {
      this.shrinkLamps()
    }

    if (
      (Math.random() > 1 - this.rules.chances.shrinkDriveLanes ?? 0.8) ||
      this.street.remainingWidth < 4
    ) {
      this.shrinkDriveLanes()
    }

    const candidates = []
    for (const type of types.sort(() => 0.5 - Math.random())) {
      const info = getSegmentInfo(type)
      if (
        !info.rules?.minWidth ||
        info.rules.minWidth > this.street.remainingWidth
      ) {
        continue
      }
      candidates.push(type)
    }

    if (candidates.length === 0) {
      if (Math.random() > 1 - this.rules.chances.replaceSegment ?? 0.7) {
        for (
          let i = Math.floor(
            Math.random() * this.rules.maxSegmentsReplaced ??
              4 + this.rules.minSegmentsReplaced ??
              2
          );
          i > 0;
          i--
        ) {
          this.replaceSegment()
        }
      }
    } else {
      const doInsert =
        Math.random() > 1 - this.rules.chances.insertSegment ?? 0.5
      if (doInsert) {
        this.insertSegment(candidates)
      }
      this.recalculateWidth()

      // if there's still room, try to insert more segments
      if (doInsert) {
        let i = 0
        while (this.street.remainingWidth > this.street.width / 3 || i > 20) {
          this.insertSegment(candidates)
          this.recalculateWidth()
          i++
        }
      }
    }

    this.shrinkLamps()
    this.expandSidewalks()

    if (this.street.remainingWidth < 0) {
      const segments = this.street.segments.filter(
        (segment) => segment.type !== 'sidewalk'
      )
      const segmentsToShrink = segments.filter(
        (segment) =>
          segment.width - getSegmentInfo(segment.type).rules?.minWidth > 0
      )
      for (const segment of segmentsToShrink) {
        segment.width = getSegmentInfo(segment.type).rules?.minWidth
      }
    }

    this.recalculateWidth()

    console.log({ start: startStreet.segments, end: this.street.segments })
    console.table(startStreet.segments)
    console.table(this.street.segments)

    if (
      this.street.segments.some((segment) =>
        segment.warnings.some((warning) => warning)
      )
    ) {
      const segments = this.street.segments.filter((segment) =>
        segment.warnings.some((warning) => warning)
      )
      for (const segment of segments) {
        const info = getSegmentInfo(segment.type)
        segment.width = info.rules?.minWidth ?? info.defaultWidth
        this.recalculateWidth()
        if (
          !this.street.segments.some((segment) =>
            segment.warnings.some((warning) => warning)
          )
        ) {
          break
        }
      }

      if (
        this.street.segments.some((segment) =>
          segment.warnings.some((warning) => warning)
        )
      ) {
        const firstSegmentWithWarning = this.street.segments.find((segment) =>
          segment.warnings.some((warning) => warning)
        )
        const firstSegmentWithWarningIndex = this.street.segments.indexOf(
          firstSegmentWithWarning
        )
        this.street.segments.splice(firstSegmentWithWarningIndex, 1)
        this.recalculateWidth()
        this.expandEnds()
      }
    }

    this.cleanup()
    if (this.street.remainingWidth > 0) this.expandEnds()

    const endHash = this.hash()

    if (startHash === endHash) {
      if (loop > this.rules.maxLoops) {
        throw new Error(
          'AutoMix failed to generate a valid street layout; please try again or adjust your layout.'
        )
      }
      console.warn(
        'AutoMix generated an identical layout, trying again',
        `(${loop})`
      )
      return this.mix(++loop)
    } else {
      if (
        this.street.segments.some((segment) =>
          segment.warnings.some((warning) => warning)
        )
      ) {
        if (loop > this.rules.maxLoops) {
          throw new Error(
            'AutoMix failed to generate a valid street layout; please try again or adjust your layout.'
          )
        }
        console.warn(
          'AutoMix generated an invalid layout, trying again',
          `(${loop})`
        )
        return this.mix(++loop)
      }
    }

    console.timeEnd('AutoMix: Mix')
    return this
  }

  /**
   * Mixes the variants of the street's segments
   */
  mixVariants (loop = 0) {
    console.time('AutoMix: Mix Variants')
    const environments = ['day', 'night', 'twilight', 'dawn', 'dusk', 'fog']
    this.street.environment =
      environments[Math.floor(Math.random() * environments.length)]

    const segmentsHash = this.street.segments
      .map((segment) => `${segment.type}:${segment.variantString}`)
      .join('!')

    this.street.segments = this.street.segments.map((segment) => {
      const skipTypes = ['turn-lane']
      if (skipTypes.includes(segment.type)) return segment

      const info = getSegmentInfo(segment.type)
      const variantStrings = Object.keys(info.details)
      const variants = variantStrings.map((variant) => ({
        variantString: variant,
        ...getVariantArray(segment.type, variant)
      }))

      let previousSegment =
        this.street.segments[this.street.segments.indexOf(segment) - 1]
      if (!previousSegment) previousSegment = segment

      const ruleKeys = Object.keys(this.rules.stats.adjacencyStats)
      let matchKeys = ruleKeys
        .filter(
          (key) =>
            key.split('->')[0] ===
            `${previousSegment.type}:${previousSegment.variantString}`
        )
        .filter((key) => key.split('->')[1].split(':')[0] === segment.type)

      matchKeys.splice(
        matchKeys.findIndex(
          (key) => key.split('->')[1].split(':')[1] === segment.variantString
        ),
        1
      )

      if (segment.variantString.includes('inbound')) {
        matchKeys = matchKeys.filter((key) =>
          key.split('->')[1].split(':')[1].includes('inbound')
        )
      } else if (segment.variantString.includes('outbound')) {
        matchKeys = matchKeys.filter((key) =>
          key.split('->')[1].split(':')[1].includes('outbound')
        )
      }

      const matchWeights = matchKeys.map((key) => [
        key.split('->')[1].split(':')[1],
        this.rules.stats.adjacencyStats[key] ?? 0
      ])
      const nextVariant = this.weightedRandom(matchWeights)
      if (!nextVariant) return segment

      const variant = variants.find(
        (variant) => variant.variantString === nextVariant
      )
      if (!variant) return segment

      return { ...segment, variant, variantString: variant.variantString }
    })

    this.recalculateWidth()

    console.debug(
      `Mixed street with ${this.street.segments.length} segments in ${loop} loops`
    )
    console.timeEnd('AutoMix: Mix Variants')

    if (
      segmentsHash ===
      this.street.segments
        .map((segment) => `${segment.type}:${segment.variantString}`)
        .join('!')
    ) {
      if (loop > this.rules.maxLoops) {
        throw new Error(
          'AutoMix failed to generate a valid street layout; please try again or adjust your layout.'
        )
      }
      console.warn(
        'AutoMix generated an identical layout, trying again',
        `(${loop})`
      )
      return this.mix(++loop)
    }

    if (
      this.street.segments.some((segment) =>
        segment.warnings.some((warning) => warning)
      )
    ) {
      if (loop > this.rules.maxLoops) {
        throw new Error(
          'AutoMix failed to generate a valid street layout; please try again or adjust your layout.'
        )
      }
      console.warn(
        'AutoMix generated an invalid layout, trying again',
        `(${loop})`
      )
      return this.mix(++loop)
    }

    return this
  }

  /**
   * Creates a new weighted random street layout
   */
  create () {
    this.street.segments = []
    let currentWidth = 0
    let loop = 0

    const environments = ['day', 'night', 'twilight', 'dawn', 'dusk', 'fog']
    this.street.environment =
      environments[Math.floor(Math.random() * environments.length)]

    console.time('AutoMix: New Street')
    while (currentWidth < this.street.width) {
      if (++loop > 100) throw new Error('AutoMix creation failure')
      let isLastSegment = false

      let segment =
        this.rules.start && this.street.segments.length === 0
          ? this.getSegment(
            this.rules.start[(this.rules.start.length * Math.random()) << 0]
          )
          : this.getSegment()

      let info = getSegmentInfo(segment.type)
      segment.width = info.defaultWidth

      if (currentWidth + info.defaultWidth >= this.street.width) {
        isLastSegment = true
      }

      if (currentWidth + info.defaultWidth > this.street.width) {
        const endStats = this.rules.stats.endStats
        const endWeights = Object.entries(endStats)
        segment = this.rules.end
          ? this.getSegment(this.weightedRandom(endWeights))
          : this.getSegment()
        info = getSegmentInfo(segment.type)

        segment.width = info.rules?.minWidth ?? info.defaultWidth

        if (currentWidth + segment.width > this.street.width) {
          for (const [index, segment] of this.street.segments.entries()) {
            const info = getSegmentInfo(segment.type)
            segment.width = info.rules?.minWidth ?? info.defaultWidth
            this.street.segments[index] = segment
          }

          currentWidth = this.street.segments.reduce(
            (acc, segment) => acc + segment.width,
            0
          )

          const remainingWidth = this.street.width - currentWidth

          // expand the first and last segments to fill remaining width
          const firstSegment = this.street.segments[0]
          const lastSegment =
            this.street.segments[this.street.segments.length - 1]
          const firstInfo = getSegmentInfo(firstSegment.type)
          const lastInfo = getSegmentInfo(lastSegment.type)
          const firstSegmentWidth = firstSegment.width + remainingWidth / 2
          const lastSegmentWidth = lastSegment.width + remainingWidth / 2
          firstSegment.width = firstSegmentWidth
          lastSegment.width = lastSegmentWidth

          // if the first segment is too wide, expand the last segment
          if (firstSegment.width > firstInfo.rules?.maxWidth) {
            lastSegment.width =
              lastSegment.width +
              firstSegment.width -
              firstInfo.rules?.maxWidth
            firstSegment.width = firstInfo.rules?.maxWidth
          }

          // if the last segment is too wide, expand the first segment
          if (lastSegment.width > lastInfo.rules?.maxWidth) {
            firstSegment.width =
              firstSegment.width + lastSegment.width - lastInfo.rules?.maxWidth
            lastSegment.width = lastInfo.rules?.maxWidth
          }

          break
        }
      }

      try {
        segment.variant =
          segment.variant || this.getRandomVariant(segment.type)
        if (!segment.variant) continue
      } catch (e) {
        console.error(e)
        continue
      }

      if (Array.isArray(segment.variant)) {
        segment.variant = getVariantString(segment.variant)
      }

      const newSegment = {
        id: nanoid(),
        type: segment.type,
        variantString: segment.variant,
        width: segment.width,
        elevation: 0,
        label: info.name,
        variant: getVariantArray(segment.type, segment.variant)
      }

      if (this.validateSegment(newSegment)) {
        currentWidth += segment.width
        this.street.segments.push(newSegment)
      } else {
        if (isLastSegment) {
          this.street.segments.push(newSegment)
          newSegment.width = this.street.width - currentWidth
          currentWidth += newSegment.width
          break
        }
      }
    }

    this.recalculateWidth()

    console.debug(
      `Created street with ${this.street.segments.length} segments in ${loop} loops`
    )
    console.timeEnd('AutoMix: New Street')
    return this
  }

  /**
   * Do some cleanup to ensure other rules are met
   */
  cleanup () {
    // Are there two lamps less three segments apart?
    const lamps = this.street.segments.filter(
      (segment) => segment.type === 'sidewalk-lamp'
    )

    for (const lamp of lamps) {
      const lampIndex = this.street.segments.indexOf(lamp)
      const lampDistance = 3
      const lampDistanceIndex = lampIndex + lampDistance
      const lampDistanceSegment = this.street.segments[lampDistanceIndex]

      if (lampDistanceSegment && lampDistanceSegment.type === 'sidewalk-lamp') {
        const lampDistanceSegmentIndex =
          this.street.segments.indexOf(lampDistanceSegment)
        const lampDistanceSegmentDistance =
          lampDistanceSegmentIndex - lampIndex
        if (lampDistanceSegmentDistance < lampDistance) {
          const index = this.street.segments.indexOf(lampDistanceSegment)
          this.street.segments.splice(index, 1)
        }
      }
    }

    // Are all turn lanes between two opposing drive lanes?
    const turnLanes = this.street.segments.filter(
      (segment) => segment.type === 'turn-lane'
    )

    for (const turnLane of turnLanes) {
      const turnLaneIndex = this.street.segments.indexOf(turnLane)
      const turnLaneInboundIndex = turnLaneIndex - 1
      const turnLaneOutboundIndex = turnLaneIndex + 1
      const turnLaneInboundSegment = this.street.segments[turnLaneInboundIndex]
      const turnLaneOutboundSegment =
        this.street.segments[turnLaneOutboundIndex]

      if (!turnLaneInboundSegment || !turnLaneOutboundSegment) {
        this.street.segments.splice(turnLaneIndex, 1)
      }

      if (
        turnLaneInboundSegment &&
        turnLaneOutboundSegment &&
        (turnLaneInboundSegment.type !== 'drive-lane' ||
          turnLaneOutboundSegment.type !== 'drive-lane') &&
        (!turnLaneInboundSegment.variantString.includes('inbound') ||
          !turnLaneOutboundSegment.variantString.includes('outbound'))
      ) { this.street.segments.splice(turnLaneIndex, 1) }
    }

    this.recalculateWidth()
  }

  /**
   * Returns a random segment
   * If type or variant are specified, returns a segment of that type or variant
   * If neither are specified, returns a random segment
   * If type is specified but variant is not, returns a random variant of that type
   */
  getSegment (type, variant) {
    type = type ?? this.getRandomType()
    variant = variant ?? this.getRandomVariant(type)
    return { type, variant }
  }

  /**
   * Returns a random segment type, weighted by the adjacency stats of the prior or initial segment
   */
  getRandomType () {
    const types = Object.keys(SEGMENT_INFO)

    if (this.street.segments.length === 0) {
      const startStats = this.rules.stats.startStats
      const startWeights = Object.entries(startStats).map(
        ([key, { count }]) => [key, count]
      )
      const type = this.weightedRandom(startWeights)

      if (!type) return types[Math.floor(Math.random() * types.length)]
      else return type.split(':')[0]
    } else {
      const lastSegment = this.street.segments[this.street.segments.length - 1]
      const lastSegmentTypeVariant = `${lastSegment.type}:${lastSegment.variantString}`
      const ruleKeys = Object.keys(this.rules.stats.adjacencyStats)
      const matchKeys = ruleKeys.filter(
        (key) => key.split('->')[0] === lastSegmentTypeVariant
      )

      const matchWeights = matchKeys.map((key) => [
        key.split('->')[1].split(':')[0],
        this.rules.stats.adjacencyStats[key] ?? 0
      ])

      const nextType = this.weightedRandom(matchWeights)

      if (!nextType) return types[Math.floor(Math.random() * types.length)]
      return nextType
    }
  }

  /**
   * Returns a random segment variant based on the given type,
   * weighted by the adjacency stats of the prior or initial segment
   */
  getRandomVariant (type, variantIncludes) {
    const typeInfo = getSegmentInfo(type)
    const variantStrings = Object.keys(typeInfo.details)
    const variantIncludesArray = variantIncludes?.split('|') ?? []
    const variantIncludesArrayMatch = variantStrings.filter((variantString) =>
      variantIncludesArray.every((variant) => variantString.includes(variant))
    )

    let lastSegment = this.street.segments[this.street.segments.length - 1]

    if (!lastSegment) {
      const startStats = this.rules.stats.startStats
      const startWeights = Object.entries(startStats)
      const startType = this.weightedRandom(startWeights)
      lastSegment = {
        type: startType.split(':')[0],
        variantString: startType.split(':')[1]
      }
    }

    const ruleKeys = Object.keys(this.rules.stats.adjacencyStats)
    let matchKeys = ruleKeys
      .filter(
        (key) =>
          key.split('->')[0] ===
          `${lastSegment.type}:${lastSegment.variantString}`
      )
      .filter((key) => key.split('->')[1].split(':')[0] === type)

    if (variantIncludesArrayMatch.length > 0) {
      matchKeys = matchKeys.filter((key) =>
        key.split('->')[1].split(':')[1].includes(variantIncludes)
      )
    }

    if (this.rules.variants[type]) {
      matchKeys = matchKeys.filter((key) =>
        this.rules.variants[type].includes(key.split('->')[1].split(':')[1])
      )
    }

    const matchWeights = matchKeys.map((key) => [
      key.split('->')[1].split(':')[1],
      this.rules.stats.adjacencyStats[key] ?? 0
    ])

    let [, variantString] = this.upgradeSegment(
      type,
      this.weightedRandom(matchWeights)
    )

    if (!variantString) {
      const variantStats = this.rules.stats.variantStats
      const variantWeights = Object.entries(variantStats[type])
      variantString = this.upgradeSegment(
        type,
        this.weightedRandom(variantWeights)
      )
    }

    variantString = Array.isArray(variantString)
      ? variantString.slice(1).join('|')
      : variantString
    return variantString
  }

  /**
   * Returns a random item from an array of items, weighted by the item's weight
   */
  weightedRandom (items) {
    const totalWeight = items.reduce((acc, [_, weight]) => acc + weight, 0)
    const random = Math.random() * totalWeight
    let weightSum = 0
    for (const [item, weight] of items) {
      weightSum += weight
      if (random < weightSum) return item
    }
  }

  /**
   * Upgrades a segment type and variant to a valid type and variant,
   * in case the chosen variant is from an old schema in the dataset
   */
  upgradeSegment (type, variant) {
    if (type === 'bike-lane' && variant?.split('|').length === 2) {
      variant = variant + '|road'
    }
    if (type === 'bus-lane' && variant?.split('|').length === 2) {
      variant = variant + '|typical'
    }
    if (type === 'food-truck' && !['left', 'right'].includes(variant)) {
      variant = 'right'
    }

    if (type === 'bike-lane' && variant?.includes('colored')) {
      variant = variant.replace('colored', 'green')
    }

    return [type, variant]
  }

  /**
   * Expands the first and last segments to fill remaining width
   */
  expandEnds () {
    const firstSegment = this.street.segments[0]
    const lastSegment = this.street.segments[this.street.segments.length - 1]

    const firstSegmentInfo = getSegmentInfo(firstSegment.type)
    const lastSegmentInfo = getSegmentInfo(lastSegment.type)

    let firstSegmentWidth = firstSegment.width + this.street.remainingWidth / 2
    let lastSegmentWidth = lastSegment.width + this.street.remainingWidth / 2

    firstSegmentWidth = Math.round(firstSegmentWidth * 2) / 2
    lastSegmentWidth = Math.round(lastSegmentWidth * 2) / 2

    if (firstSegmentWidth > firstSegmentInfo.rules?.maxWidth) { firstSegmentWidth = firstSegmentInfo.rules?.maxWidth }
    if (lastSegmentWidth > lastSegmentInfo.rules?.maxWidth) { lastSegmentWidth = lastSegmentInfo.rules?.maxWidth }

    const firstRule = this.rules.maxWidths[firstSegment.type]
    const lastRule = this.rules.maxWidths[lastSegment.type]

    if (firstRule && firstSegmentWidth > firstRule) { firstSegmentWidth = firstRule }
    if (lastRule && lastSegmentWidth > lastRule) lastSegmentWidth = lastRule

    firstSegment.width = firstSegmentWidth
    lastSegment.width = lastSegmentWidth
    this.recalculateWidth()

    while (this.street.remainingWidth > 0) {
      const firstSegment = this.street.segments.find(
        (segment) =>
          segment.width < getSegmentInfo(segment.type).rules?.maxWidth
      )

      if (!firstSegment) break

      firstSegment.width += this.street.remainingWidth
      this.recalculateWidth()
    }
  }

  /**
   * Expands sidewalks to fill remaining width
   */
  expandSidewalks () {
    const sidewalks = this.street.segments.filter(
      (segment) => segment.type === 'sidewalk'
    )
    const remainingWidth = this.street.remainingWidth / sidewalks.length
    if (remainingWidth < 0) return false

    for (const sidewalk of sidewalks) {
      if (sidewalk.width + remainingWidth > this.street.width * 0.3) {
        sidewalk.width = this.street.width * 0.3
        continue
      } else {
        sidewalk.width += remainingWidth
      }

      if (sidewalk.width > this.rules.maxWidths.sidewalk) { sidewalk.width = this.rules.maxWidths.sidewalk }
      sidewalk.width = Math.round(sidewalk.width * 2) / 2
    }

    this.recalculateWidth()
  }

  /**
   * Shrinks drive lanes to gain extra space
   */
  shrinkDriveLanes () {
    const driveLaneInfo = getSegmentInfo('drive-lane')
    const driveLanes = this.street.segments.filter(
      (segment) => segment.type === 'drive-lane'
    )
    const maxDriveLaneWidthDifference =
      driveLanes[0]?.width - driveLaneInfo.rules.minWidth
    const driveLaneWidthDifference = Math.floor(
      Math.random() * maxDriveLaneWidthDifference + 1
    )

    for (const lane of driveLanes) {
      if (lane.width > driveLaneInfo.rules.minWidth) {
        lane.width -= driveLaneWidthDifference
      }
    }

    const busLaneInfo = getSegmentInfo('bus-lane')
    const busLanes = this.street.segments.filter(
      (segment) => segment.type === 'bus-lane'
    )
    const maxBusLaneWidthDifference =
      busLanes[0]?.width - busLaneInfo.rules.minWidth
    const busLaneWidthDifference = Math.floor(
      Math.random() * maxBusLaneWidthDifference + 1
    )

    for (const lane of busLanes) {
      if (lane.width > busLaneInfo.rules.minWidth) {
        lane.width -= busLaneWidthDifference
      }
    }

    this.recalculateWidth()
  }

  /**
   * Shrinks lamps to gain extra space
   */
  shrinkLamps () {
    const lampInfo = getSegmentInfo('sidewalk-lamp')
    const lamps = this.street.segments.filter(
      (segment) => segment.type === 'sidewalk-lamp'
    )

    for (const lamp of lamps) {
      lamp.width = lampInfo.defaultWidth
    }

    this.recalculateWidth()
  }

  /**
   * Removes drive lanes to gain extra space
   */
  removeDriveLanes () {
    if (
      this.counts().numDriveLanesInbound > 1 &&
      this.counts().numDriveLanesOutbound > 1
    ) {
      const driveLanesInbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'drive-lane' &&
          segment.variantString.includes('inbound')
      )

      const driveLanesOutbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'drive-lane' &&
          segment.variantString.includes('outbound')
      )

      const busLanesInbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'bus-lane' &&
          segment.variantString.includes('inbound')
      )

      const busLanesOutbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'bus-lane' &&
          segment.variantString.includes('outbound')
      )

      if (driveLanesInbound.length > 1) {
        const outerDriveLanesInbound = driveLanesInbound.filter(
          (segment) => segment !== driveLanesInbound[0]
        )

        for (const segment of outerDriveLanesInbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }

      if (driveLanesOutbound.length > 1) {
        const outerDriveLanesOutbound = driveLanesOutbound.filter(
          (segment) => segment !== driveLanesOutbound[0]
        )
        for (const segment of outerDriveLanesOutbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }

      if (busLanesInbound.length > 1) {
        const outerBusLanesInbound = busLanesInbound.filter(
          (segment) => segment !== busLanesInbound[0]
        )

        for (const segment of outerBusLanesInbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }

      if (busLanesOutbound.length > 1) {
        const outerBusLanesOutbound = busLanesOutbound.filter(
          (segment) => segment !== busLanesOutbound[0]
        )
        for (const segment of outerBusLanesOutbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }
    }

    this.recalculateWidth()
  }

  /**
   * Removes bike lanes to gain extra space
   */
  removeBikeLanes () {
    if (
      this.counts().numBikeLanesInbound > 1 ||
      this.counts().numBikeLanesOutbound > 1
    ) {
      const bikeLanesInbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'bike-lane' &&
          segment.variantString.includes('inbound')
      )

      const bikeLanesOutbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'bike-lane' &&
          segment.variantString.includes('outbound')
      )

      if (bikeLanesInbound.length > 1) {
        const outerBikeLanesInbound = bikeLanesInbound.filter(
          (segment) => segment !== bikeLanesInbound[0]
        )

        for (const segment of outerBikeLanesInbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }

      if (bikeLanesOutbound.length > 1) {
        const outerBikeLanesOutbound = bikeLanesOutbound.filter(
          (segment) => segment !== bikeLanesOutbound[0]
        )
        for (const segment of outerBikeLanesOutbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }
    }
  }

  /**
   * Removes parking lanes to gain extra space
   */
  removeParkingLanes () {
    if (
      this.counts().numParkingLanesInbound > 1 ||
      this.counts().numParkingLanesOutbound > 1
    ) {
      const parkingLanesInbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'parking-lane' &&
          segment.variantString.includes('inbound')
      )

      const parkingLanesOutbound = this.street.segments.filter(
        (segment) =>
          segment.type === 'parking-lane' &&
          segment.variantString.includes('outbound')
      )

      if (parkingLanesInbound.length > 1) {
        const outerParkingLanesInbound = parkingLanesInbound.filter(
          (segment) => segment !== parkingLanesInbound[0]
        )

        for (const segment of outerParkingLanesInbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }

      if (parkingLanesOutbound.length > 1) {
        const outerParkingLanesOutbound = parkingLanesOutbound.filter(
          (segment) => segment !== parkingLanesOutbound[0]
        )
        for (const segment of outerParkingLanesOutbound) {
          const index = this.street.segments.indexOf(segment)
          this.street.segments.splice(index, 1)
        }
      }
    }
  }

  /**
   * Removes sidewalks to gain extra space
   */
  removeSidewalks () {
    const sidewalks = this.street.segments.filter(
      (segment) => segment.type === 'sidewalk'
    )

    if (sidewalks.length > 2) {
      const outerSidewalks = sidewalks.filter(
        (segment) =>
          segment !== sidewalks[0] &&
          segment !== sidewalks[sidewalks.length - 1]
      )

      for (const segment of outerSidewalks) {
        const index = this.street.segments.indexOf(segment)
        this.street.segments.splice(index, 1)
      }
    }

    this.recalculateWidth()
  }

  /**
   * Removes lamps to gain extra space
   */
  removeLamps () {
    const lamps = this.street.segments.filter(
      (segment) => segment.type === 'sidewalk-lamp'
    )

    if (lamps.length > 2) {
      const outerLamps = lamps.filter(
        (segment) => segment !== lamps[0] && segment !== lamps[lamps.length - 1]
      )

      for (const segment of outerLamps) {
        const index = this.street.segments.indexOf(segment)
        this.street.segments.splice(index, 1)
      }
    }

    this.recalculateWidth()
  }

  /**
   * Removes invalid turn lanes
   */
  removeInvalidTurnLanes () {
    const turnLanes = this.street.segments.filter(
      (segment) => segment.type === 'turn-lane'
    )

    for (const turnLane of turnLanes) {
      let invalid = false
      const index = this.street.segments.indexOf(turnLane)

      const previousSegment = this.street.segments[index - 1]
      const nextSegment = this.street.segments[index + 1]

      if (!previousSegment || !nextSegment) invalid = true

      const previousIsTravelLane = ['drive-lane', 'bus-lane'].includes(
        previousSegment?.type
      )
      const nextIsTravelLane = ['drive-lane', 'bus-lane'].includes(
        nextSegment?.type
      )

      const previousIsInbound =
        previousSegment?.variantString.includes('inbound')
      const nextIsInbound = nextSegment?.variantString.includes('inbound')

      const previousIsOutbound =
        previousSegment?.variantString.includes('outbound')
      const nextIsOutbound = nextSegment?.variantString.includes('outbound')

      if (!previousIsTravelLane || !nextIsTravelLane) invalid = true

      if (
        previousIsTravelLane &&
        nextIsTravelLane &&
        ((previousIsInbound && nextIsInbound) ||
          (previousIsOutbound && nextIsOutbound))
      ) { invalid = true }

      if (invalid) this.street.segments.splice(index, 1)
    }
  }

  /**
   * Replace parking lanes
   */
  replaceParkingLanes () {
    const parkingLanesInbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'parking-lane' &&
        segment.variantString.includes('inbound')
    )

    const parkingLanesOutbound = this.street.segments.filter(
      (segment) =>
        segment.type === 'parking-lane' &&
        segment.variantString.includes('outbound')
    )

    if (parkingLanesInbound.length || parkingLanesOutbound.length) {
      const candidate =
        this.rules.replace.parkingLane[
          Math.floor(Math.random() * this.rules.replace.parkingLane.length)
        ]
      const info = getSegmentInfo(candidate)

      for (const parkingLane of parkingLanesInbound) {
        const index = this.street.segments.indexOf(parkingLane)
        const candidateVariantString = this.getRandomVariant(
          candidate,
          'inbound'
        )

        const widthRule = this.rules.maxWidths[candidate]
        if (widthRule && parkingLane.width > widthRule) { parkingLane.width = widthRule }

        const segment = {
          id: nanoid(),
          type: candidate,
          variantString: candidateVariantString,
          width: parkingLane.width,
          elevation: parkingLane.elevation,
          label: info.name,
          variant: getVariantArray(candidate, candidateVariantString)
        }

        if (this.validateSegment(segment)) {
          this.street.segments.splice(index, 1, segment)
        } else {
          console.log('Invalid segment generated for replacement')
        }
      }

      for (const parkingLane of parkingLanesOutbound) {
        const index = this.street.segments.indexOf(parkingLane)
        const candidateVariantString = this.getRandomVariant(
          candidate,
          'outbound'
        )

        const widthRule = this.rules.maxWidths[candidate]
        if (widthRule && parkingLane.width > widthRule) { parkingLane.width = widthRule }

        const segment = {
          id: nanoid(),
          type: candidate,
          variantString: candidateVariantString,
          width: parkingLane.width,
          elevation: parkingLane.elevation,
          label: info.name,
          variant: getVariantArray(candidate, candidateVariantString)
        }

        if (this.validateSegment(segment)) {
          this.street.segments.splice(index, 1, segment)
        } else {
          console.log('Invalid segment generated for replacement')
        }
      }
    }
  }

  /**
   * Replace turn lanes with acceptable variants
   */
  replaceTurnLanes () {
    const turnLanes = this.street.segments.filter(
      (segment) => segment.type === 'turn-lane'
    )

    for (const turnLane of turnLanes) {
      const rules = this.rules.variants[turnLane.type]
      if (!rules) continue

      if (rules.includes(turnLane.variantString)) continue
      const matchDirectionRules = turnLane.variantString.includes('inbound')
        ? rules.filter((rule) => rule.includes('inbound'))
        : rules.filter((rule) => rule.includes('outbound'))

      turnLane.variantString =
        matchDirectionRules[
          Math.floor(Math.random() * matchDirectionRules.length)
        ]
    }
  }

  /**
   * Replaces a random segment with a new segment, weighted by the adjacency stats
   */
  replaceSegment (
    segmentToReplace = this.street.segments[
      Math.floor(Math.random() * this.street.segments.length)
    ]
  ) {
    const priorSegment =
      this.street.segments[this.street.segments.indexOf(segmentToReplace) - 1]
    const isLastSegment =
      this.street.segments.indexOf(segmentToReplace) ===
      this.street.segments.length - 1
    // const isLastDriveLane =
    //   segmentToReplace.type === 'drive-lane' &&
    //   this.street.segments.filter((segment) => segment.type === 'drive-lane')
    //     .length === 1

    if (!priorSegment || isLastSegment) return false
    if (
      segmentToReplace.type === 'sidewalk' ||
      segmentToReplace.type === 'drive-lane'
    ) { return false }

    const ruleKeys = Object.keys(this.rules.stats.adjacencyStats)
    const matchKeys = ruleKeys
      .filter((key) => key.split('->')[0].split(':')[0] === priorSegment.type)
      .filter(
        (key) => key.split('->')[1].split(':')[0] !== segmentToReplace.type
      )

    const matchWeights = matchKeys.map((key) => [
      key.split('->')[1],
      this.rules.stats.adjacencyStats[key] ?? 0
    ])

    const nextRule = this.weightedRandom(matchWeights)
    if (!nextRule) return false

    const parts = nextRule.split(':')
    const [type, variant] = this.upgradeSegment(parts[0], parts[1])

    let elevation = segmentToReplace.elevation
    const segmentsOfType = this.street.segments.filter(
      (segment) => segment.type === type
    )
    if (segmentsOfType.length > 0) elevation = segmentsOfType[0].elevation

    if (/^sidewalk/.test(type)) {
      const sidewalks = this.street.segments.filter(
        (segment) => segment.type === 'sidewalk'
      )
      if (sidewalks.length > 0) elevation = sidewalks[0].elevation
    }

    if (/transit-shelter/.test(type)) {
      const sidewalks = this.street.segments.filter(
        (segment) => segment.type === 'sidewalk'
      )
      if (sidewalks.length > 0) elevation = sidewalks[0].elevation
    }

    if (segmentToReplace.variantString.includes('inbound')) {
      variant.replace('outbound', 'inbound')
    }
    if (segmentToReplace.variantString.includes('outbound')) {
      variant.replace('inbound', 'outbound')
    }

    const id = nanoid()
    const info = getSegmentInfo(type)
    const segment = {
      id,
      type,
      elevation,
      label: info.name,
      variantString: variant,
      variant: getVariantArray(type, variant),
      width: info.rules?.minWidth || segmentToReplace.width
    }

    if (this.validateSegment(segment)) {
      const nextIndex = this.street.segments.indexOf(segmentToReplace)
      this.street.segments.splice(nextIndex, 1, segment)
      this.recalculateWidth()
    } else {
      console.log('Invalid segment generated for replacement')
    }

    return true
  }

  /**
   * Inserts a new segment after a random segment, weighted by the adjacency stats
   */
  insertSegment (candidates) {
    let candidateWeights = Object.entries(this.rules.stats.adjacencyStats)
      .filter(([key]) => candidates.includes(key.split('->')[0].split(':')[0]))
      .filter(([key]) => key.split('->')[1].split(':')[0] !== 'sidewalk')

    for (const [key, value] of Object.entries(this.rules.maxInstances)) {
      const count = this.street.segments.filter(
        (segment) => segment.type === key
      ).length

      if (count >= value) {
        candidateWeights = candidateWeights.filter(
          ([candidate]) => !candidate.includes(key)
        )
      }
    }

    const candidate = this.weightedRandom(candidateWeights)
    const parts = candidate.split('->')[1].split(':')
    let [type, variant] = this.upgradeSegment(parts[0], parts[1])

    const customVariantRule = this.rules.variants[type]
    if (customVariantRule) {
      variant =
        customVariantRule[Math.floor(Math.random() * customVariantRule.length)]
    }

    const info = getSegmentInfo(type)
    const segment = this.placementHeuristics({
      id: nanoid(),
      type,
      variantString: variant,
      width: info.defaultWidth,
      elevation: info.defaultElevation,
      label: info.name,
      variant: getVariantArray(type, variant)
    })

    this.removeInvalidTurnLanes()

    if (this.validateSegment(segment)) {
      const ruleKeys = Object.keys(this.rules.stats.adjacencyStats)
      const matchKeys = ruleKeys
        .filter((key) => key.split('->')[1].split(':')[0] === type)
        .filter((key) => key.split('->')[0].split(':')[0] !== type)

      const matchWeights = matchKeys.map((key) => [
        key.split('->')[0].split(':')[0],
        this.rules.stats.adjacencyStats[key] ?? 0
      ])

      const nextType = this.weightedRandom(matchWeights)
      const nextSegment = this.street.segments.find(
        (segment) => segment.type === nextType
      )
      const nextIndex = this.street.segments.indexOf(nextSegment)

      this.street.segments.splice(nextIndex, 0, segment)
      this.recalculateWidth()
    } else {
      console.log('Invalid segment')
    }
  }

  /**
   * Validates an individual segment
   */
  validateSegment (segment) {
    // Check Segment Rules
    // =====================
    const info = getSegmentInfo(segment.type)
    if (info.rules?.minWidth > segment.width) return false
    if (info.rules?.maxWidth < segment.width) return false
    // =====================

    return true
  }

  /**
   * Validates the entire street
   */
  validateStreet () {
    // Check AutoMix Rules
    // =====================
    if (this.rules.start && this.street.segments.length === 0) {
      if (!this.rules.start.includes(this.street.segments[0].type)) {
        return false
      }
    }

    if (this.rules.end && this.street.segments.length > 0) {
      if (
        !this.rules.end.includes(
          this.street.segments[this.street.segments.length - 1].type
        )
      ) {
        return false
      }
    }
    // =====================

    // Check Segment Rules
    // =====================
    for (const segment of this.street.segments) {
      const info = getSegmentInfo(segment.type)
      if (info.rules?.minWidth > segment.width) return false
      if (info.rules?.maxWidth < segment.width) return false
    }
    // =====================

    return true
  }

  /**
   * TODO: Use this to place more relevant segments
   */
  placementHeuristics (segment) {
    const { street } = this
    const { type, variantString } = segment

    const segmentBeforeEl = street.segments.indexOf(segment) - 1
    const segmentAfterEl = street.segments.indexOf(segment) + 1

    const left =
      segmentAfterEl !== undefined ? street.segments[segmentAfterEl] : null
    const right =
      segmentBeforeEl !== undefined ? street.segments[segmentBeforeEl] : null

    const leftOwner = left && SegmentTypes[getSegmentInfo(left.type).owner]
    const rightOwner = right && SegmentTypes[getSegmentInfo(right.type).owner]

    const leftOwnerAsphalt =
      leftOwner === SegmentTypes.CAR ||
      leftOwner === SegmentTypes.BIKE ||
      leftOwner === SegmentTypes.TRANSIT
    const rightOwnerAsphalt =
      rightOwner === SegmentTypes.CAR ||
      rightOwner === SegmentTypes.BIKE ||
      rightOwner === SegmentTypes.TRANSIT

    const leftVariant = left && getVariantArray(left.type, left.variantString)
    const rightVariant =
      right && getVariantArray(right.type, right.variantString)

    const variant = getVariantArray(type, variantString)
    const segmentInfo = getSegmentInfo(type)

    // Direction

    if (segmentInfo.variants.indexOf('direction') !== -1) {
      if (leftVariant && leftVariant.direction) {
        variant.direction = leftVariant.direction
      } else if (rightVariant && rightVariant.direction) {
        variant.direction = rightVariant.direction
      }
    }

    // Bike lane direction

    if (segmentInfo.variants.indexOf('bike-direction') !== -1) {
      if (leftVariant && leftVariant.direction) {
        variant['bike-direction'] = leftVariant.direction
      } else if (rightVariant && rightVariant.direction) {
        variant['bike-direction'] = rightVariant.direction
      } else {
        variant['bike-direction'] = 'inbound'
      }
    }

    // Parking lane orientation

    if (segmentInfo.variants.indexOf('parking-lane-orientation') !== -1) {
      if (!right || !rightOwnerAsphalt) {
        variant['parking-lane-orientation'] = 'right'
      } else if (!left || !leftOwnerAsphalt) {
        variant['parking-lane-orientation'] = 'left'
      }
    }

    // Parklet orientation

    if (type === 'parklet') {
      if (left && leftOwnerAsphalt) {
        variant.orientation = 'right'
      } else if (right && rightOwnerAsphalt) {
        variant.orientation = 'left'
      }
    }

    // Turn lane orientation

    if (segmentInfo.variants.indexOf('turn-lane-orientation') !== -1) {
      if (!right || !rightOwnerAsphalt) {
        variant['turn-lane-orientation'] = 'right'
      } else if (!left || !leftOwnerAsphalt) {
        variant['turn-lane-orientation'] = 'left'
      }
    }

    return {
      ...segment,
      variantString: getVariantString(variant),
      variant
    }
  }
}
