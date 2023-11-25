import adjacencyStats from './stats/adjacency.json'
import variantStats from './stats/variant.json'
import startStats from './stats/start.json'
import endStats from './stats/end.json'

export default {
  maxLoops: 150,
  minSegmentsReplaced: 2,
  maxSegmentsReplaced: 5,
  chances: {
    replaceSegment: 0.9,
    insertSegment: 0.5,
    shrinkDriveLanes: 1,
    shrinkLamps: 1
  },
  stats: {
    adjacencyStats,
    variantStats,
    startStats,
    endStats
  }
}
