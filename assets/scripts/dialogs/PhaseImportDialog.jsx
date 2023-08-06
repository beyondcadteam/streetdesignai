import React from 'react'
import { FormattedMessage } from 'react-intl'
import { useForm } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import { useDispatch, useSelector } from 'react-redux'

import { setAppFlags } from '../store/slices/app'
import { updateStreetData } from '../store/slices/street'
import Button from '../ui/Button'
import Dialog from './Dialog'
import './PhaseImportDialog.scss'

const PhaseImportDialog = (props) => {
  const { register, handleSubmit } = useForm({
    shouldUseNativeValidation: true
  })

  const dispatch = useDispatch()
  const street = useSelector((state) => state.street)

  const compatibilityUpgrade = (segments) => {
    const upgrade = (segment) => {
      let variantString = segment.variantString

      switch (segment.type) {
        case 'bus-lane':
          if (variantString?.split('|').length === 2) { variantString += '|typical' }
          break
        case 'bike-lane':
          if (variantString?.includes('colored')) {
            variantString = variantString.replace('colored', 'green')
          }
          if (variantString?.split('|').length === 2) {
            variantString = variantString + '|road'
          }
          break
      }

      return {
        ...segment,
        variantString,
        id: segment.id || uuidv4(),
        elevation: segment.elevation || 1
      }
    }

    return segments.map(upgrade)
  }

  const onSubmit = async ({ link }, closeDialog) => {
    try {
      const url = new URL(link)
      const streetNamespace = url.pathname.split('/')[2]
      const apiUrl = `${url.origin}/api/v1/streets?namespacedId=${streetNamespace}`
      const result = await fetch(apiUrl)
      const data = await result.json()
      console.log(url.host + ' response:', { data })

      const { name } = data

      const {
        environment,
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
      } = data.data.street

      const newPhase = {
        id: uuidv4(),
        name: name || `Imported Phase (${streetNamespace})`,
        street: {
          namespacedId: street.namespacedId,
          environment: environment || 'day',
          leftBuildingHeight,
          leftBuildingVariant,
          location,
          rightBuildingHeight,
          rightBuildingVariant,
          schemaVersion,
          segments: compatibilityUpgrade(segments),
          showAnalytics,
          units,
          width
        }
      }

      const cleanPhases = street.phases.map((phase) => ({
        ...phase,
        street: { ...phase.street, phases: null }
      }))

      const newPhases = [...cleanPhases, newPhase]

      dispatch(updateStreetData({ ...newPhase.street, phases: newPhases }))
      dispatch(setAppFlags({ activePhase: newPhase }))
      closeDialog()
    } catch (error) {
      console.error(error)
      window.alert('Error importing phase')
    }
  }

  return (
    <Dialog>
      {(closeDialog) => {
        return (
          <div className="phaseImport-dialog">
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
