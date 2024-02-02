import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useIntl } from 'react-intl'

import { setAppFlags } from '../store/slices/app'
import { updateStreetData } from '../store/slices/street'
import Button from '../ui/Button'
import StreetMetaWidthContainer from './StreetMetaWidthContainer'
import StreetMetaAuthor from './StreetMetaAuthor'
import StreetMetaDate from './StreetMetaDate'
import StreetMetaGeotag from './StreetMetaGeotag'
import StreetMetaAnalytics from './StreetMetaAnalytics'
import './StreetMeta.scss'

function StreetMeta (props) {
  const enableAnalytics = useSelector(
    (state) => (state.flags.ANALYTICS && state.flags.ANALYTICS.value) || false
  )

  const intl = useIntl()
  const dispatch = useDispatch()

  const app = useSelector((state) => state.app)
  const street = useSelector((state) => state.street)

  const addNewLayout = () => {
    const newLayout = {
      id: street.id + `:layout-${Date.now().toString(36).slice(2)}`,
      phases: street.phases.map((phase) => phase.id),
      name:
        street.name ||
        intl.formatMessage({
          id: 'street.default-name',
          defaultMessage: 'Unnamed St'
        }) + ` : Layout ${street.layouts.length + 1}`
    }

    const newStreet = {
      ...street,
      layouts: [...street.layouts, newLayout]
    }

    dispatch(updateStreetData(newStreet))
    dispatch(setAppFlags({ activeLayout: newLayout }))
  }

  return (
    <>
      <div className="street-metadata">
        {app.layoutMode
          ? (
            <Button
              secondary={true}
              id="layout-view-add-phase-button"
              onClick={addNewLayout}
            >
              {intl.formatMessage({
                id: 'phases.addLayout',
                defaultMessage: 'Add Layout'
              })}
            </Button>
            )
          : (
            <>
              <StreetMetaWidthContainer />
              {enableAnalytics && <StreetMetaAnalytics />}
              <StreetMetaGeotag />
              <StreetMetaAuthor />
              <StreetMetaDate />
            </>
            )}
      </div>

      {!app.layoutMode && (
        <div className="street-metadata-phases">
          {street?.phases?.length > 1 &&
            street.phases.map((phase) => {
              return (
                <div
                  id={`phase-${phase.id.split('phase-')[1]}`}
                  key={phase.id}
                  className={
                    phase.id === app.activePhase?.id ? 'selected' : null
                  }
                  onClick={() => {
                    const clonedPhases = JSON.parse(
                      JSON.stringify(street.phases)
                    ).map((phase) => ({
                      ...phase,
                      street: { ...phase.street, phases: null }
                    }))

                    const index = clonedPhases.findIndex(
                      (p) => p.id === phase.id
                    )
                    const clonedPhase = clonedPhases[index]
                    if (!clonedPhase) return
                    if (!clonedPhase.street.layouts) { clonedPhase.street.layouts = street.layouts }

                    dispatch(setAppFlags({ activePhase: clonedPhase }))
                    dispatch(
                      updateStreetData({
                        ...phase.street,
                        phases: clonedPhases,
                        layouts: street.layouts
                      })
                    )
                  }}
                >
                  <span>{phase.name}</span>
                </div>
              )
            })}
        </div>
      )}
    </>
  )
}

export default StreetMeta
