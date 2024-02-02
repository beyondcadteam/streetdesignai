import React from 'react'
import { FormattedMessage } from 'react-intl'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'

import { updateStreetData } from '../store/slices/street'
import Button from '../ui/Button'
import Dialog from './Dialog'
import './PhasePasteDialog.scss'

const PhasePasteDialog = (props) => {
  const [importPhases, setImportPhases] = React.useState([])
  const [availablePhases, setAvailablePhases] = React.useState()

  React.useEffect(() => {
    if (!availablePhases) {
      console.log('Reading from clipboard')
      try {
        let copyData = localStorage.getItem('clipboard')
        if (!copyData) {
          localStorage.setItem('clipboard', '{ "phases": [] }')
          copyData = localStorage.getItem('clipboard')
        }

        const data = JSON.parse(copyData)
        const { phases } = data
        setAvailablePhases(phases)
      } catch (error) {
        console.error(error)
      }
    }
  }, [availablePhases])

  const { register, handleSubmit } = useForm({
    shouldUseNativeValidation: true
  })

  const dispatch = useDispatch()
  const street = useSelector((state) => state.street)

  const onSubmit = async (_, closeDialog) => {
    try {
      if (importPhases.length === 0) return

      const newPhases = importPhases.map((phase) => {
        const offset = Math.floor(Math.random() * 1000)
        const newPhase = {
          ...phase,
          id:
            street.id + `:phase-${(Date.now() + offset).toString(36).slice(2)}`,
          street: {
            ...phase.street,
            id: street.id,
            namespacedId: street.namespacedId
          }
        }

        return newPhase
      })

      const newStreet = {
        ...street,
        phases: [...street.phases, ...newPhases]
      }

      dispatch(updateStreetData(newStreet))
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
          <div className="phase-paste-dialog">
            <header>
              <h1>
                <FormattedMessage
                  id="dialogs.phasePaste.heading"
                  defaultMessage="Phase Clipboard"
                />
              </h1>
            </header>
            <div className="dialog-content">
              <form
                onSubmit={handleSubmit((data) => onSubmit(data, closeDialog))}
              >
                <div>
                  {availablePhases?.length === 0 && (
                    <p>No phases in clipboard</p>
                  )}
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
                          style={{ maxWidth: '20px', marginRight: '1rem' }}
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

                <Button
                  primary={true}
                  type="submit"
                  style={{ width: '100%' }}
                  disabled={importPhases.length === 0}
                >
                  <FormattedMessage
                    id="dialogs.phasePaste.paste"
                    defaultMessage="Paste"
                  />
                </Button>

                <Button
                  type="button"
                  style={{ width: '100%' }}
                  disabled={availablePhases?.length === 0}
                  onClick={() => {
                    localStorage.setItem('clipboard', '{ "phases": [] }')
                    setAvailablePhases([])
                  }}
                >
                  <FormattedMessage
                    id="dialogs.phasePaste.clear"
                    defaultMessage="Clear Clipboard"
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

export default PhasePasteDialog
