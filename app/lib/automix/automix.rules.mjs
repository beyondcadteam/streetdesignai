import adjacencyStats from './stats/adjacency.json'
import variantStats from './stats/variant.json'
import startStats from './stats/start.json'
import endStats from './stats/end.json'

export default {
  maxLoops: 150,
  minSegmentsReplaced: 2,
  maxSegmentsReplaced: 5,
  maxWidths: {
    sidewalk: 12,
    'sidewalk-tree': 12,
    'sidewalk-lamp': 6,
    'bike-lane': 4,
    'transit-shelter': 12
  },
  maxInstances: {
    sidewalk: 4,
    'sidewalk-lamp': 2,
    'sidewalk-bench': 2,
    'sidewalk-tree': 2,
    'bike-rack': 2,
    'bike-share': 2,
    'bus-lane': 2,
    'transit-shelter': 2
  },
  chances: {
    replaceSegment: 0.8,
    insertSegment: 0.9,
    shrinkDriveLanes: 1,
    shrinkLamps: 1
  },
  replace: {
    parkingLane: ['bike-lane', 'bus-lane', 'parklet', 'sidewalk']
  },
  variants: {
    'turn-lane': [
      'outbound|left',
      'outbound|shared',
      'inbound|left',
      'inbound|shared'
    ]
  },
  stats: {
    adjacencyStats,
    variantStats,
    startStats,
    endStats
  }
}
