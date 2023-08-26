import React, { createRef, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useIntl } from 'react-intl'

import './LayoutView.scss'
import { EyeClosedIcon } from '@primer/octicons-react'
import { setAppFlags } from '../store/slices/app'
import Button from '../ui/Button'
import StreetView from './StreetView'
import SkyContainer from './SkyContainer'

export default function LayoutView () {
  const [skyHeight, setSkyHeight] = useState(window.innerHeight)
  const street = useSelector((state) => state.street)
  const layout = useSelector((state) => state.app.activeLayout)
  const dispatch = useDispatch()
  const view = createRef()
  const intl = useIntl()

  useEffect(() => {
    if (view.current) setSkyHeight(view.current.scrollHeight)
  }, [view])

  const switchLayout = (id) => {
    dispatch(
      setAppFlags({ activeLayout: street.layouts.find((l) => l.id === id) })
    )
  }

  const toggleLayoutMode = () => {
    dispatch(setAppFlags({ layoutMode: false }))
  }

  return (
    <div className="layout-view" ref={view}>
      {layout?.phases.map((phase) => {
        return (
          <StreetView
            key={phase}
            phase={street.phases.find((p) => p.id === phase)}
          />
        )
      })}

      <SkyContainer height={skyHeight} />

      <div id="layout-view-layouts-menu">
        <div id="layout-view-layouts-menu-header">
          <h1>Layout Mode</h1>
          <span
            title={intl.formatMessage({
              id: 'layouts.layoutMode',
              defaultMessage: 'Toggle Layout Mode'
            })}
            onClick={toggleLayoutMode}
            style={{
              cursor: 'pointer',
              marginLeft: '1rem'
            }}
          >
            <EyeClosedIcon size={20} />
          </span>
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
    </div>
  )
}
