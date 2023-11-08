import { nanoid } from 'nanoid'

import SEGMENT_INFO from '../../../assets/scripts/segments/info.json'
import { getSegmentInfo } from '../../../assets/scripts/segments/info'
import { getVariantArray } from '../../../assets/scripts/segments/variant_utils'
import { recalculateWidth } from '../../../assets/scripts/streets/width'
import DefaultRules from './automix.rules.mjs'

const MAX_LOOPS = 25

export default class AutoMix {
  street = null
  rules = DefaultRules

  constructor (street, rules = DefaultRules) {
    this.street = street
    this.rules = rules
  }

  getVariant (type, variant) {
    const info = getSegmentInfo(type)
    return Object.keys(info.details).find(
      (key) => info.details[key].name === variant
    )
  }

  getSegment (type, variant) {
    type = type ?? this.getRandomType()
    variant = variant ?? this.getRandomVariant(type)
    return { type, variant }
  }

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

    let variantString = this.weightedRandom(matchWeights)

    // Upgrade old variant strings, hoping for the best; refactor this later
    if (type === 'bike-lane' && variantString?.split('|').length === 2) { variantString = variantString + '|road' }
    if (type === 'bus-lane' && variantString?.split('|').length === 2) { variantString = variantString + '|typical' }
    if (type === 'food-truck' && !['left', 'right'].includes(variantString)) { variantString = 'right' }

    if (type === 'bike-lane' && variantString?.includes('colored')) { variantString = variantString.replace('colored', 'green') }

    if (!variantString) {
      const variantStats = this.rules.stats.variantStats
      const variantWeights = Object.entries(variantStats[type])
      variantString = this.weightedRandom(variantWeights)
    }
    return variantString
  }

  weightedRandom (items) {
    const totalWeight = items.reduce((acc, [_, weight]) => acc + weight, 0)
    const random = Math.random() * totalWeight
    let weightSum = 0
    for (const [item, weight] of items) {
      weightSum += weight
      if (random < weightSum) return item
    }
  }

  mix (loop = 0) {
    console.time('AutoMix: Mix Variants')
    const environments = ['day', 'night', 'dawn', 'dusk']
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
      if (loop > MAX_LOOPS) { throw new Error('This street layout does not allow for any variation') }
      console.warn('AutoMix generated an identical layout, trying again')
      return this.mix(++loop)
    }

    if (
      this.street.segments.some((segment) =>
        segment.warnings.some((warning) => warning)
      )
    ) {
      if (loop > MAX_LOOPS) { throw new Error('This street layout does not allow for any variation') }
      console.warn('AutoMix generated an invalid layout, trying again')
      return this.mix(++loop)
    }

    return this
  }

  create () {
    this.street.segments = []
    let currentWidth = 0
    let loop = 0

    const environments = ['day', 'night', 'dawn', 'dusk']
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

      if (currentWidth + info.defaultWidth >= this.street.width) { isLastSegment = true }
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

    // console.debug(`Created street with ${this.street.segments.length} segments in ${loop} loops`)
    console.timeEnd('AutoMix: New Street')
    return this
  }

  validateSegment (segment) {
    // Check Segment Rules
    // ===================
    const info = getSegmentInfo(segment.type)
    if (info.rules?.minWidth > segment.width) return false
    if (info.rules?.maxWidth < segment.width) return false
    // ===================

    return true
  }

  validateStreet () {
    // Check AutoMix Rules
    // ===================
    if (this.rules.start && this.street.segments.length === 0) {
      if (!this.rules.start.includes(this.street.segments[0].type)) { return false }
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
    // ===================

    // Check Segment Rules
    // ===================
    for (const segment of this.street.segments) {
      const info = getSegmentInfo(segment.type)
      if (info.rules?.minWidth > segment.width) return false
      if (info.rules?.maxWidth < segment.width) return false
    }
    // ===================

    return true
  }
}
