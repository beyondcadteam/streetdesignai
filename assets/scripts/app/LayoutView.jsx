import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useIntl } from 'react-intl'

import './LayoutView.scss'
import { showDialog } from '../store/slices/dialogs'
import { setAppFlags } from '../store/slices/app'
import Button from '../ui/Button'
import { updateStreetData } from '../store/slices/street'
import StreetView from './StreetView'
import SkyContainer from './SkyContainer'

export default function LayoutView () {
  const app = useSelector((state) => state.app)
  const street = useSelector((state) => state.street)
  const layout = useSelector((state) => state.app.activeLayout)
  const dispatch = useDispatch()
  const view = useRef()
  const dragPhase = useRef()
  const dropPhase = useRef()
  const intl = useIntl()

  const [skyHeight, setSkyHeight] = useState(window.innerHeight)
  const [displayPhases, setDisplayPhases] = useState(layout.phases)

  useEffect(() => {
    if (view.current) setSkyHeight(view.current.scrollHeight)
  }, [view])

  useEffect(() => {
    if (layout?.phases) setDisplayPhases(layout.phases)
  }, [layout.phases])

  useEffect(() => {
    const displayPhasesEqual = displayPhases.every(
      (p, i) => p === layout.phases[i]
    )
    if (displayPhasesEqual) return

    const newLayout = { ...layout }
    newLayout.phases = displayPhases.map((p) =>
      street.phases.find((s) => s.id === p)
    )
    dispatch(
      updateStreetData({
        ...street,
        layouts: street.layouts.map((l) => (l.id === layout.id ? newLayout : l))
      })
    )
  }, [displayPhases]) // eslint-disable-line react-hooks/exhaustive-deps

  const switchLayout = (id) => {
    dispatch(
      setAppFlags({ activeLayout: street.layouts.find((l) => l.id === id) })
    )
  }

  const toggleLayoutMode = () => {
    dispatch(setAppFlags({ layoutMode: false }))
  }

  const openLayoutDialog = () => {
    dispatch(
      setAppFlags({
        dialogData: {
          layout: app.activeLayout,
          phases: street.phases?.map((phase) => ({
            ...phase,
            street: { ...phase.street, phases: null }
          }))
        }
      })
    )

    dispatch(showDialog('LAYOUT_EDIT'))
  }

  return (
    <div className="layout-view" ref={view}>
      {displayPhases.map((phase) => {
        return (
          <StreetView
            key={phase}
            phase={street.phases.find((p) => p.id === phase)}
          />
        )
      })}

      <SkyContainer height={skyHeight} environment="day" />

      <div id="layout-view-layouts-menu">
        <div id="layout-view-layouts-menu-header">
          <Button
            onClick={toggleLayoutMode}
            style={{ margin: 'auto' }}
            tertiary={true}
          >
            {intl.formatMessage({
              id: 'layouts.exitLayoutMode',
              defaultMessage: 'Exit Layout Mode'
            })}
          </Button>
        </div>

        {street.layouts.map((l) => {
          return (
            <Button
              key={l.id}
              primary={layout.id === l.id}
              onClick={() => switchLayout(l.id)}
            >
              {l.name}
            </Button>
          )
        })}
      </div>

      <div id="layout-view-phases-menu">
        <Button
          onClick={openLayoutDialog}
          tertiary={true}
          style={{ width: '70%', margin: 'auto' }}
        >
          {intl.formatMessage({
            id: 'layouts.editLayout',
            defaultMessage: 'Edit Layout'
          })}
        </Button>

        <div id="layout-view-phases-menu-list" style={{ width: '100%' }}>
          {displayPhases.map((p) => {
            return (
              <Button
                key={p}
                id={`layout-view-phase-menu-button__${p}`}
                className="layout-view-phase-menu-button"
                draggable={true}
                style={{ cursor: 'move', width: '100%', marginBottom: '1rem' }}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', p)
                  dragPhase.current = e.target
                }}
                onDragEnter={(e) => {
                  const buttons = document.querySelectorAll(
                    '.layout-view-phase-menu-button'
                  )
                  buttons.forEach((b) => {
                    b.style.backgroundColor = '#c8ecf6'
                  })

                  e.currentTarget.style.backgroundColor = '#5bc17d'
                  dropPhase.current = e.currentTarget
                }}
                onDragEnd={(e) => {
                  const buttons = document.querySelectorAll(
                    '.layout-view-phase-menu-button'
                  )
                  buttons.forEach((b) => {
                    b.style.backgroundColor = '#c8ecf6'
                  })

                  const dropPhaseID = dropPhase.current.id.split('__')[1]
                  if (!dropPhaseID) return

                  const dropPhaseData = street.phases.find(
                    (p) => p.id === dropPhaseID
                  )
                  const dragPhaseIndex = displayPhases.findIndex(
                    (p) => p === dragPhase.current.id.split('__')[1]
                  )
                  const dropPhaseIndex = displayPhases.findIndex(
                    (p) => p === dropPhaseData.id
                  )

                  if (dropPhaseIndex === dragPhaseIndex) return

                  const newDisplayPhases = [...displayPhases]
                  if (dragPhaseIndex >= 0) { newDisplayPhases.splice(dragPhaseIndex, 1) }
                  newDisplayPhases.splice(
                    dropPhaseIndex,
                    0,
                    dragPhase.current.id.split('__')[1]
                  )
                  setDisplayPhases(newDisplayPhases)
                }}
              >
                {street.phases.find((s) => s.id === p).name}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
