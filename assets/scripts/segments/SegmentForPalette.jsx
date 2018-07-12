import React from 'react'
import PropTypes from 'prop-types'
import { injectIntl, intlShape } from 'react-intl'
import { DragSource } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import SegmentCanvas from './SegmentCanvas'
import { TILE_SIZE } from './constants'
import { Types, paletteSegmentSource, collectDragSource } from './drag_and_drop'
import { getSegmentVariantInfo, getSegmentInfo } from './info'
import { getVariantInfoDimensions } from './view'
import { generateRandSeed } from '../util/random'

const PALETTE_SEGMENT_EXTRA_PADDING = 8
const PALETTE_SEGMENT_Y_OFFSET = 20
const PALETTE_SEGMENT_MULTIPLIER = 4

class SegmentForPalette extends React.Component {
  static propTypes = {
    intl: intlShape.isRequired,
    type: PropTypes.string.isRequired,
    variantString: PropTypes.string.isRequired,
    connectDragSource: PropTypes.func,
    connectDragPreview: PropTypes.func
  }

  componentDidMount = () => {
    this.props.connectDragPreview(getEmptyImage(), { captureDraggingState: true })
  }

  render () {
    // Get localized display names
    const segmentInfo = getSegmentInfo(this.props.type)
    const variantInfo = getSegmentVariantInfo(this.props.type, this.props.variantString)
    const defaultMessage = variantInfo.name || segmentInfo.name

    // Determine width to render at
    const dimensions = getVariantInfoDimensions(variantInfo, 0, 1)

    let width = dimensions.right - dimensions.left
    if (!width) {
      width = segmentInfo.defaultWidth
    }
    width += PALETTE_SEGMENT_EXTRA_PADDING
    width = width * TILE_SIZE / PALETTE_SEGMENT_MULTIPLIER

    return this.props.connectDragSource(
      <div
        style={{ width: width + 'px' }}
        className="segment segment-in-palette"
        title={this.props.intl.formatMessage({ id: `segments.${segmentInfo.nameKey}`, defaultMessage })}
      >
        <SegmentCanvas
          width={width}
          type={this.props.type}
          variantString={this.props.variantString}
          randSeed={generateRandSeed()}
          multiplier={(PALETTE_SEGMENT_MULTIPLIER / TILE_SIZE)}
          offsetTop={PALETTE_SEGMENT_Y_OFFSET}
          forPalette
        />
      </div>
    )
  }
}

export default DragSource(Types.PALETTE_SEGMENT, paletteSegmentSource, collectDragSource)(injectIntl(SegmentForPalette))
