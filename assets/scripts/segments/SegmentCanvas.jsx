import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { getSegmentVariantInfo } from './info'
import { drawSegmentContents, getVariantInfoDimensions } from './view'
import { TILE_SIZE } from './constants'
import './SegmentCanvas.scss'

const GROUND_BASELINE = 400
const CANVAS_HEIGHT = 480
const CANVAS_GROUND = 35
const CANVAS_BASELINE = CANVAS_HEIGHT - CANVAS_GROUND

class SegmentCanvas extends React.PureComponent {
  static propTypes = {
    actualWidth: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    variantString: PropTypes.string.isRequired,
    randSeed: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    groundBaseline: PropTypes.number,
    elevation: PropTypes.number,
    dpi: PropTypes.number,
    updatePerspective: PropTypes.func
  }

  static defaultProps = {
    groundBaseline: GROUND_BASELINE,
    updatePerspective: () => {}
  }

  constructor (props) {
    super(props)

    this.state = {
      error: null
    }

    this.canvasEl = React.createRef()
  }

  componentDidMount () {
    this.props.updatePerspective(this.canvasEl.current)

    this.drawSegment()
    // Normally this.drawSegment() on its own works just fine, except in
    // Safari where the canvases are missing assets unless something is
    // interacted with, after which all canvases are redrawn. This doesn't
    // seem to be an asset loading issue, this is a Safari bug. By putting
    // drawSegment() in a setTimeout() we're trying to force a second
    // canvas render on mount in order to unstick the Safari bug.
    window.setTimeout(() => {
      this.drawSegment()
    }, 0)
  }

  componentDidUpdate (prevProps) {
    if (prevProps.variantString !== this.props.variantString) {
      this.props.updatePerspective(this.canvasEl.current)
    }

    this.drawSegment()
  }

  componentDidCatch (error, info) {
    this.setState({
      error
    })
  }

  drawSegment = () => {
    const canvas = this.canvasEl.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawSegmentContents(
      ctx,
      this.props.type,
      this.props.variantString,
      this.props.actualWidth,
      0,
      this.props.groundBaseline,
      this.props.elevation,
      this.props.randSeed,
      1,
      this.props.dpi
    )
  }

  render () {
    // Determine the maximum width of the artwork for this segment
    const variantInfo = getSegmentVariantInfo(
      this.props.type,
      this.props.variantString
    )
    const dimensions = getVariantInfoDimensions(
      variantInfo,
      this.props.actualWidth
    )
    const totalWidth = dimensions.right - dimensions.left

    // If the graphics are wider than the width of the segment, then we will draw
    // our canvas a little bigger to make sure that the graphics aren't truncated.
    const displayWidth =
      totalWidth > this.props.actualWidth ? totalWidth : this.props.actualWidth

    // Determine dimensions to draw DOM element
    const elementWidth = displayWidth * TILE_SIZE
    const elementHeight = CANVAS_BASELINE

    // Determine size of canvas
    const canvasWidth = Math.round(elementWidth * this.props.dpi)
    const canvasHeight = elementHeight * this.props.dpi
    const canvasStyle = {
      width: Math.round(elementWidth),
      height: elementHeight,
      left: dimensions.left * TILE_SIZE
    }

    return (
      <canvas
        className="segment-image"
        ref={this.canvasEl}
        width={canvasWidth}
        height={canvasHeight}
        style={canvasStyle}
      />
    )
  }
}

function mapStateToProps (state) {
  return {
    dpi: state.system.devicePixelRatio,
    redrawCanvas: state.flags.DEBUG_SEGMENT_CANVAS_RECTANGLES.value
  }
}

export default connect(mapStateToProps)(SegmentCanvas)
