import React from 'react'
import { FormattedMessage } from 'react-intl'
import { useForm } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import { useDispatch, useSelector } from 'react-redux'

import {
  calculateOccupiedWidth,
  calculateRemainingWidth
} from '../streets/width'
import { setAppFlags } from '../store/slices/app'
import { updateStreetData } from '../store/slices/street'
import { updateToLatestSchemaVersion } from '../streets/data_model'
import Button from '../ui/Button'
import Dialog from './Dialog'
import './PhaseImportDialog.scss'

const PhaseImportDialog = (props) => {
  const [importPhases, setImportPhases] = React.useState([])
  const [availablePhases, setAvailablePhases] = React.useState([])

  const { register, handleSubmit } = useForm({
    shouldUseNativeValidation: true
  })

  const dispatch = useDispatch()
  const street = useSelector((state) => state.street)

  const onSubmit = async ({ link }, closeDialog) => {
    try {
      const url = new URL(link)
      const isBeyond = ['beyondware.com', 'beyondcad.com'].includes(url.host)

      let streetNamespace = url.pathname.split('/')[2]
      let apiUrl = `${url.origin}/api/v1/streets?namespacedId=${streetNamespace}`

      if (isBeyond) {
        streetNamespace = url.searchParams.get('street')
        apiUrl = `${process.env.BEYOND_BACKEND}/api/v1/streets?namespacedId=${streetNamespace}`
      }

      const result = await fetch(apiUrl)
      const data = await result.json()
      console.log(url.host + ' response:', { data })

      const { name, phases } = data
      setAvailablePhases(phases)

      let toImport = []
      if (phases && importPhases.length === 0) {
        setImportPhases(phases)
        return
      } else if (phases && importPhases.length > 0) {
        toImport = importPhases
      }

      // TODO: DRY this up
      if (!phases || toImport.length === 0) {
        const {
          environment,
          leftBuildingHeight,
          leftBuildingVariant,
          location,
          rightBuildingHeight,
          rightBuildingVariant,
          segments,
          schemaVersion,
          showAnalytics,
          units,
          width
        } = data.data.street

        const occupiedWidth = calculateOccupiedWidth(segments)
        const remainingWidth = calculateRemainingWidth(width, occupiedWidth)

        const newStreet = {
          name: street.name || name,
          namespacedId: street.namespacedId,
          environment: environment || 'day',
          remainingWidth,
          occupiedWidth,
          leftBuildingHeight,
          leftBuildingVariant,
          location,
          rightBuildingHeight,
          rightBuildingVariant,
          schemaVersion,
          segments,
          showAnalytics,
          units,
          width
        }

        updateToLatestSchemaVersion(newStreet)

        const newPhase = {
          id: uuidv4(),
          name: name || `Imported Phase (${streetNamespace})`,
          street: newStreet
        }

        const cleanPhases = street.phases.map((phase) => ({
          ...phase,
          street: {
            ...phase.street,
            name: phase.street.name || name,
            phases: null
          }
        }))

        const newPhases = [...cleanPhases, newPhase]
        dispatch(updateStreetData({ ...newPhase.street, phases: newPhases }))
        dispatch(setAppFlags({ activePhase: newPhase }))
      } else if (toImport.length > 0) {
        const streetPhases = [...street.phases]

        for (const phase of toImport) {
          const {
            environment,
            leftBuildingHeight,
            leftBuildingVariant,
            location,
            rightBuildingHeight,
            rightBuildingVariant,
            segments,
            schemaVersion,
            showAnalytics,
            units,
            width
          } = phase.street

          const occupiedWidth = calculateOccupiedWidth(segments)
          const remainingWidth = calculateRemainingWidth(width, occupiedWidth)

          const newStreet = {
            name: phase.street.name || name,
            namespacedId: street.namespacedId,
            environment: environment || 'day',
            remainingWidth,
            occupiedWidth,
            leftBuildingHeight,
            leftBuildingVariant,
            location,
            rightBuildingHeight,
            rightBuildingVariant,
            schemaVersion,
            segments,
            showAnalytics,
            units,
            width
          }

          updateToLatestSchemaVersion(newStreet)

          const newPhase = {
            id: uuidv4(),
            name: phase.name || `Imported Phase (${streetNamespace})`,
            street: newStreet
          }

          const cleanPhases = streetPhases.map((phase) => ({
            ...phase,
            street: {
              ...phase.street,
              name: phase.street.name || name,
              phases: null
            }
          }))

          streetPhases.push(newPhase)
          const newPhases = [...cleanPhases, newPhase]
          dispatch(updateStreetData({ ...newPhase.street, phases: newPhases }))
          dispatch(setAppFlags({ activePhase: newPhase }))
        }
      }

      closeDialog()
    } catch (error) {
      console.error(error)
      window.alert('Error importing phase')
    }
  }

  const updateImportPhases = (event) => {
    if (!availablePhases) return
    const { value, checked } = event.target
    const phase = availablePhases?.find((phase) => phase?.id === value)

    if (checked) {
      setImportPhases([...importPhases, phase])
    } else {
      setImportPhases(importPhases.filter((phase) => phase.id !== value))
    }
  }

  return (
    <Dialog>
      {(closeDialog) => {
        return (
          <div className="phase-import-dialog">
            <header>
              <h1>
                <FormattedMessage
                  id="dialogs.phaseImport.heading"
                  defaultMessage="Import Phase from Link"
                />
              </h1>
            </header>
            <div className="dialog-content">
              <form
                onSubmit={handleSubmit((data) => onSubmit(data, closeDialog))}
              >
                <input
                  name="url"
                  id="phase-new-link"
                  placeholder="Paste Streetmix.net or StreetDesign.ai link"
                  {...register('link', { required: true })}
                />

                <div style={{ marginTop: '2rem' }}>
                  {availablePhases &&
                    availablePhases.map((phase) => (
                      <div key={phase.id} style={{ display: 'flex' }}>
                        <input
                          checked={importPhases.includes(phase)}
                          type="checkbox"
                          name="phase"
                          id={`phase-${phase.id}`}
                          value={phase.id}
                          {...register('phase')}
                          style={{ maxWidth: '20px' }}
                          onChange={updateImportPhases}
                        />

                        <label
                          htmlFor={`phase-${phase.id}`}
                          style={{ flex: 1 }}
                        >
                          {phase.name}
                        </label>
                      </div>
                    ))}
                </div>

                <Button primary={true} type="submit" style={{ width: '100%' }}>
                  <FormattedMessage
                    id="dialogs.phaseImport.import"
                    defaultMessage="Import"
                  />
                </Button>
              </form>
            </div>
          </div>
        )
      }}
    </Dialog>
  )
}

export default PhaseImportDialog
