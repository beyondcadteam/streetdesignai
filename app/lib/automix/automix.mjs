/**
 * AutoMix Library
 * StreetDesign.ai
 * Beyondware.com
 */

import { nanoid } from 'nanoid'

import { getSegmentInfo } from '../../../assets/scripts/segments/info'
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

  /**
   * The main AutoMix function
   * Mixes the street layout
   */
  mix (loop = 0) {
    console.time('AutoMix: Mix')
    const types = Object.keys(SEGMENT_INFO)
    const startHash = this.street.segments
      .map((segment) => segment.type)
      .join('!')

    if (
      (Math.random() > 1 - this.rules.chances.shrinkLamps ?? 0.8) ||
      this.street.remainingWidth < 4
    ) { this.shrinkLamps() }

    if (
      (Math.random() > 1 - this.rules.chances.shrinkDriveLanes ?? 0.8) ||
      this.street.remainingWidth < 4
    ) { this.shrinkDriveLanes() }

    const candidates = []
    for (const type of types.sort(() => 0.5 - Math.random())) {
      const info = getSegmentInfo(type)
      if (
        !info.rules?.minWidth ||
        info.rules.minWidth > this.street.remainingWidth
      ) { continue }
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
      if (Math.random() > 1 - this.rules.chances.insertSegment ?? 0.5) { this.insertSegment(candidates) }
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
      for (const segment of segmentsToShrink) { segment.width = getSegmentInfo(segment.type).rules?.minWidth }
    }

    this.street = { ...this.street, ...recalculateWidth(this.street) }

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
        this.street = { ...this.street, ...recalculateWidth(this.street) }
        if (
          !this.street.segments.some((segment) =>
            segment.warnings.some((warning) => warning)
          )
        ) { break }
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
        this.street = { ...this.street, ...recalculateWidth(this.street) }
        this.expandEnds()
      }
    }

    if (this.street.remainingWidth > 0) this.expandEnds()

    const endHash = this.street.segments
      .map((segment) => segment.type)
      .join('!')

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

    this.street = { ...this.street, ...recalculateWidth(this.street) }

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

      if (Array.isArray(segment.variant)) { segment.variant = getVariantString(segment.variant) }

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

    this.street = { ...this.street, ...recalculateWidth(this.street) }

    console.debug(
      `Created street with ${this.street.segments.length} segments in ${loop} loops`
    )
    console.timeEnd('AutoMix: New Street')
    return this
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
  getRandomVariant (type) {
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
    const matchKeys = ruleKeys
      .filter(
        (key) =>
          key.split('->')[0] ===
          `${lastSegment.type}:${lastSegment.variantString}`
      )
      .filter((key) => key.split('->')[1].split(':')[0] === type)

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
    const firstSegmentWidth =
      firstSegment.width + this.street.remainingWidth / 2
    const lastSegmentWidth = lastSegment.width + this.street.remainingWidth / 2
    firstSegment.width = firstSegmentWidth
    lastSegment.width = lastSegmentWidth
    this.street = { ...this.street, ...recalculateWidth(this.street) }
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
    }

    this.street = { ...this.street, ...recalculateWidth(this.street) }
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

    this.street = { ...this.street, ...recalculateWidth(this.street) }
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

    this.street = { ...this.street, ...recalculateWidth(this.street) }
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
    const isLastDriveLane =
      segmentToReplace.type === 'drive-lane' &&
      this.street.segments.filter((segment) => segment.type === 'drive-lane')
        .length === 1

    if (!priorSegment || isLastSegment || isLastDriveLane) return false
    if (segmentToReplace.type === 'sidewalk') return false

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

    if (segmentToReplace.variantString.includes('inbound')) { variant.replace('outbound', 'inbound') }
    if (segmentToReplace.variantString.includes('outbound')) { variant.replace('inbound', 'outbound') }

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
      this.street = { ...this.street, ...recalculateWidth(this.street) }
    } else {
      console.log('Invalid segment generated for replacement')
    }

    return true
  }

  /**
   * Inserts a new segment after a random segment, weighted by the adjacency stats
   */
  insertSegment (candidates) {
    const candidateWeights = Object.entries(this.rules.stats.adjacencyStats)
      .filter(([key]) => candidates.includes(key.split('->')[0].split(':')[0]))
      .filter(([key]) => key.split('->')[1].split(':')[0] !== 'sidewalk')

    const candidate = this.weightedRandom(candidateWeights)
    const parts = candidate.split('->')[1].split(':')
    const [type, variant] = this.upgradeSegment(parts[0], parts[1])

    const info = getSegmentInfo(type)
    const segment = {
      id: nanoid(),
      type,
      variantString: variant,
      width: info.defaultWidth,
      elevation: info.defaultElevation,
      label: info.name,
      variant: getVariantArray(type, variant)
    }

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
      this.street = { ...this.street, ...recalculateWidth(this.street) }
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
}
