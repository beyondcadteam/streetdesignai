import { nanoid } from 'nanoid'

import { getSegmentInfo } from '../../assets/scripts/segments/info'
import { getVariantArray } from '../../assets/scripts/segments/variant_utils'
import SEGMENT_INFO from '../../assets/scripts/segments/info.json'
import { recalculateWidth } from '../../assets/scripts/streets/width'

export const DefaultRules = {
  start: 'sidewalk', // The type of segment that must be at the start
  end: 'sidewalk', // The type of segment that must be at the end
  minDriveLanes: 1, // The minimum number of drive lanes in a street
  maxDriveLanes: 2, // The maximum number of drive lanes in a street
  minBikeLanes: 0, // The minimum number of bike lanes in a street
  maxBikeLanes: 1, // The maximum number of bike lanes in a street
  canHaveBusStop: true, // Whether a bus stop can be part of the street or not
  adjacentRules: {
    // Rules for what types can be adjacent to each type
    'drive-lane': ['bus-stop', 'parklet', 'bike-lane'],
    'transit-shelter': ['bus-lane', 'drive-lane'],
    sidewalk: ['parklet', 'bike-lane', 'drive-lane']
  },
  blockedTypes: [
    // Rules for what types can NOT be part of the street
    'bus-lane'
  ],
  blockedVariants: {
    // Rules for what variants can NOT be used for each type
    sidewalk: {
      'sidewalk-density': ['dense', 'normal', 'sparse']
    }
  }
}

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
    const type = types[Math.floor(Math.random() * types.length)]
    if (this.rules.blockedTypes.includes(type)) {
      return this.getRandomType()
    } else {
      return type
    }
  }

  getRandomVariant (type) {
    const info = getSegmentInfo(type)
    const variantStrings = Object.keys(info.details)
    const blockedVariants = this.rules.blockedVariants?.[type]
    if (blockedVariants) {
      const vString =
        variantStrings[Math.floor(Math.random() * variantStrings.length)]
      const variants = getVariantArray(type, vString)
      for (const [key, value] of Object.entries(variants)) {
        if (blockedVariants[key]?.includes(value)) continue
        return vString
      }
    }
  }

  randomize () {
    // Pick random environment
    const environments = ['day', 'night', 'dawn', 'dusk']
    this.street.environment =
      environments[Math.floor(Math.random() * environments.length)]

    // Pick random variants for each segment
    this.street.segments = this.street.segments.map((segment) => {
      const info = getSegmentInfo(segment.type)
      const variantStrings = Object.keys(info.details)
      const variants = variantStrings.map((variant) => ({
        variantString: variant,
        ...getVariantArray(segment.type, variant)
      }))
      const variant = variants[Math.floor(Math.random() * variants.length)]
      return { ...segment, variant, variantString: variant.variantString }
    })

    return this
  }

  create () {
    this.street.segments = []
    let currentWidth = 0
    let loop = 0

    while (currentWidth < this.street.width) {
      if (++loop > 100) throw new Error('AutoMix creation failure')

      let segment =
        this.rules.start && this.street.segments.length === 0
          ? this.getSegment(this.rules.start)
          : this.getSegment()
      let info = getSegmentInfo(segment.type)
      segment.width = info.defaultWidth

      if (currentWidth + info.defaultWidth > this.street.width) {
        segment = this.rules.end
          ? this.getSegment(this.rules.end)
          : this.getSegment()
        info = getSegmentInfo(segment.type)
        segment.width = info.defaultWidth

        if (this.street.width - currentWidth < info.defaultWidth) {
          segment.width = this.street.width - currentWidth
        }
      }

      segment.variant = segment.variant || this.getRandomVariant(segment.type)
      if (!segment.variant) continue

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
      }
    }

    const newWidth = recalculateWidth(this.street)
    this.street = { ...this.street, ...newWidth }

    return this
  }

  validateSegment (segment) {
    // Check AutoMix Rules
    // ===================
    if (this.rules.start && this.street.segments.length === 0) {
      if (segment.type !== this.rules.start) return false
    }

    if (this.rules.maxDriveLanes && segment.type === 'drive-lane') {
      const driveLanes = this.street.segments.filter(
        (segment) => segment.type === 'drive-lane'
      )
      if (driveLanes.length > this.rules.maxDriveLanes) return false
    }

    if (!this.rules.canHaveBusStop && segment.type === 'bus-stop') return false

    // TODO: WIP
    // const blockedVariants = this.rules.blockedVariants?.[segment.type]
    // if (blockedVariants) {
    //   const info = getSegmentInfo(segment.type)
    //   const variants = getVariantArray(segment.type, segment.variantString)
    //   for (const [key, value] of Object.entries(variants)) {
    //     if (blockedVariants[key]) {
    //       if (blockedVariants[key].includes(value)) return false
    //       // const variantStrings = Object.keys(info.details)
    //       // const newVariant = variantStrings.find(variant => !blockedVariants[key].includes(variant))

    //       // if (newVariant) {
    //       //   segment.variantString = this.getVariant(segment.type, newVariant)
    //       //   segment.variant = getVariantArray(segment.type, segment.variantString)
    //       // } else {
    //       //   return false
    //       // }
    //     }
    //   }
    // }
    // ===================

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
      if (this.street.segments[0].type !== this.rules.start) return false
    }

    if (this.rules.end && this.street.segments.length > 0) {
      if (
        this.street.segments[this.street.segments.length - 1].type !==
        this.rules.end
      ) { return false }
    }

    if (this.rules.maxDriveLanes) {
      const driveLanes = this.street.segments.filter(
        (segment) => segment.type === 'drive-lane'
      )
      if (driveLanes.length > this.rules.maxDriveLanes) return false
    }

    if (!this.rules.canHaveBusStop) {
      const busStops = this.street.segments.filter(
        (segment) => segment.type === 'bus-stop'
      )
      if (busStops.length > 0) return false
    }

    if (this.street.segments.length > 0) {
      const lastSegment = this.street.segments[this.street.segments.length - 1]
      const rule = this.rules.adjacentRules[lastSegment.type]
      if (rule && !rule.includes(this.street.segments[0].type)) return false
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
