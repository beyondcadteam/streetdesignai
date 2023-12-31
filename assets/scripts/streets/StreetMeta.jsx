import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useIntl } from 'react-intl'

import { setAppFlags } from '../store/slices/app'
import { updateStreetData } from '../store/slices/street'
import { showDialog } from '../store/slices/dialogs'
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
    <>
      <div className="street-metadata">
        {app.layoutMode
          ? (
            <Button
              secondary={true}
              id="layout-view-add-phase-button"
              onClick={openLayoutDialog}
            >
              {intl.formatMessage({
                id: 'phases.addPhases',
                defaultMessage: 'Add Phases'
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

                    dispatch(setAppFlags({ activePhase: clonedPhase }))
                    dispatch(
                      updateStreetData({
                        ...phase.street,
                        phases: clonedPhases
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
