import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { DropTarget } from 'react-dnd'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { IoPodiumOutline } from 'react-icons/io5'
import { FormattedMessage } from 'react-intl'
import { flow } from '../util/flow'
import Segment from '../segments/Segment'
import {
  TILE_SIZE,
  DRAGGING_MOVE_HOLE_WIDTH,
  DRAGGING_TYPE_RESIZE
} from '../segments/constants'
import { cancelSegmentResizeTransitions } from '../segments/resizing'
import {
  Types,
  canvasTarget,
  collectDropTarget,
  makeSpaceBetweenSegments,
  isSegmentWithinCanvas
} from '../segments/drag_and_drop'
import { getStreetCapacity } from '../segments/capacity'
import { formatNumber } from '../util/number_format'

export class StreetEditable extends React.Component {
  static propTypes = {
    // Provided by parent
    resizeType: PropTypes.number,
    setBuildingWidth: PropTypes.func.isRequired,
    updatePerspective: PropTypes.func.isRequired,
    draggingType: PropTypes.number,
    phase: PropTypes.object,

    // Provided by store
    street: PropTypes.object.isRequired,
    draggingState: PropTypes.object,
    layoutMode: PropTypes.bool,
    locale: PropTypes.string.isRequired,

    // Provided by DropTarget
    connectDropTarget: PropTypes.func
  }

  // Internal "state", but does not affect renders, so it is not React state
  withinCanvas = null

  // Placeholder for a ref.
  // TODO: Upgrade to createRef(), but this is currently broken when placed on
  // an element inside of react-dnd's `connectDragSource`.
  // Info: https://github.com/react-dnd/react-dnd/issues/998
  streetSectionEditable = null

  componentDidMount () {
    this.props.setBuildingWidth(this.streetSectionEditable)
  }

  componentDidUpdate (prevProps) {
    const { resizeType, draggingState } = this.props

    if (
      (resizeType && !prevProps.resizeType) ||
      (prevProps.draggingType === DRAGGING_TYPE_RESIZE &&
        !this.props.draggingType)
    ) {
      this.props.setBuildingWidth(this.streetSectionEditable)
    }

    if (
      prevProps.street.id !== this.props.street.id ||
      prevProps.street.width !== this.props.street.width
    ) {
      cancelSegmentResizeTransitions()
    }

    const dragEvents = ['dragover', 'touchmove']
    if (!prevProps.draggingState && draggingState) {
      dragEvents.forEach((type) => {
        window.addEventListener(type, this.updateWithinCanvas)
      })
    } else if (prevProps.draggingState && !draggingState) {
      dragEvents.forEach((type) => {
        window.removeEventListener(type, this.updateWithinCanvas)
      })
    }
  }

  updateWithinCanvas = (event) => {
    const withinCanvas = isSegmentWithinCanvas(
      event,
      this.streetSectionEditable
    )

    if (withinCanvas) {
      document.body.classList.remove('not-within-canvas')
    } else {
      document.body.classList.add('not-within-canvas')
    }

    if (this.withinCanvas !== withinCanvas) {
      this.withinCanvas = withinCanvas
    }
  }

  updateSegmentData = (ref, dataNo, segmentPos) => {
    const { segments } = this.props.phase
      ? this.props.phase.street
      : this.props.street
    const segment = segments[dataNo]

    if (segment) {
      ref.dataNo = dataNo
      ref.savedLeft = Math.round(segmentPos)
      ref.cssTransformLeft = Math.round(segmentPos)
    }
  }

  handleSwitchSegmentAway = (el) => {
    el.classList.add('create')
    el.style.left = el.savedLeft + 'px'

    this.props.updatePerspective(el)
  }

  calculateSegmentPos = (dataNo) => {
    const { segments, remainingWidth } = this.props.phase
      ? this.props.phase.street
      : this.props.street
    const { draggingState } = this.props

    let currPos = 0
    // console.debug({ dataNo }, this.props.street)

    for (let i = 0; i < dataNo; i++) {
      const width =
        draggingState && draggingState.draggedSegment === i
          ? 0
          : segments[i].width * TILE_SIZE
      currPos += width
    }

    // console.debug({ currPos })

    let mainLeft = remainingWidth
    if (draggingState && segments[draggingState.draggedSegment] !== undefined) {
      const draggedWidth = segments[draggingState.draggedSegment].width || 0
      mainLeft += draggedWidth
    }

    mainLeft = (mainLeft * TILE_SIZE) / 2
    // console.debug({ mainLeft, remainingWidth })
    // console.debug({ sum: mainLeft + currPos })

    if (draggingState && this.withinCanvas) {
      mainLeft -= DRAGGING_MOVE_HOLE_WIDTH
      const spaceBetweenSegments = makeSpaceBetweenSegments(
        dataNo,
        draggingState
      )
      return mainLeft + currPos + spaceBetweenSegments
    } else {
      return mainLeft + currPos
    }
  }

  onExitAnimations = (child) => {
    return React.cloneElement(child, {
      exit: !this.props.street.immediateRemoval
    })
  }

  renderStreetSegments = () => {
    const { segments, units, immediateRemoval } = this.props.phase
      ? this.props.phase.street
      : this.props.street
    const streetId = this.props.street.id

    // console.debug('Rendering Segments', { streetId, segments })

    return segments.map((segment, i) => {
      const segmentPos = this.calculateSegmentPos(i)

      const segmentEl = (
        <CSSTransition
          key={`${streetId}.${segment.id}`}
          timeout={250}
          classNames="switching-away"
          exit={!immediateRemoval}
          onExit={this.handleSwitchSegmentAway}
          unmountOnExit={true}
        >
          <Segment
            dataNo={i}
            segment={{ ...segment }}
            actualWidth={segment.width}
            units={units}
            segmentPos={segmentPos}
            updateSegmentData={this.updateSegmentData}
            updatePerspective={this.props.updatePerspective}
          />
        </CSSTransition>
      )

      return segmentEl
    })
  }

  render () {
    const { connectDropTarget } = this.props
    const style = {
      width: this.props.street.width * TILE_SIZE + 'px'
    }

    // TODO: Fix duplicate IDs by adapting the logic that uses the ID
    return connectDropTarget(
      <div
        id="street-section-editable"
        className="street-section-editable"
        key={this.props.street.id}
        style={style}
        ref={(ref) => {
          this.streetSectionEditable = ref
        }}
      >
        {this.props.layoutMode && (
          <>
            <h1 className="street-section-layout-phase-name">
              {this.props.phase.name}
            </h1>
            <div className="street-section-layout-phase-meta">
              <IoPodiumOutline style={{ marginInline: '0.5rem' }} />
              <FormattedMessage
                id="capacity.ppl-per-hour"
                defaultMessage="{capacity} people/hr"
                values={{
                  capacity: formatNumber(
                    getStreetCapacity(this.props.phase.street).average,
                    this.props.locale
                  )
                }}
              />
            </div>
          </>
        )}
        <TransitionGroup
          key={this.props.street.id}
          component={null}
          enter={false}
          childFactory={this.onExitAnimations}
        >
          {this.renderStreetSegments()}
        </TransitionGroup>
      </div>
    )
  }
}

function mapStateToProps (state) {
  return {
    street: state.street,
    layoutMode: state.app.layoutMode,
    activeLayout: state.app.activeLayout,
    draggingState: state.ui.draggingState,
    locale: state.locale.locale
  }
}

export default flow([
  DropTarget(
    [Types.SEGMENT, Types.PALETTE_SEGMENT],
    canvasTarget,
    collectDropTarget
  ),
  connect(mapStateToProps)
])(StreetEditable)
