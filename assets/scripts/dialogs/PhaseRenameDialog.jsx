import React from 'react'
import { FormattedMessage } from 'react-intl'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'

import { setAppFlags } from '../store/slices/app'
import { updateStreetData } from '../store/slices/street'
import Button from '../ui/Button'
import Dialog from './Dialog'
import './PhaseRenameDialog.scss'

const PhaseRenameDialog = (props) => {
  const { register, handleSubmit } = useForm({
    shouldUseNativeValidation: true
  })

  const dispatch = useDispatch()
  const street = useSelector((state) => state.street)
  const { dialogData } = useSelector((state) => state.app)

  const onSubmit = ({ name }, closeDialog) => {
    const newItems = [...street.phases]

    const phases = newItems.map((p) => {
      if (p.id === dialogData.phaseId) return { ...p, name }
      return p
    })

    const activePhase = phases.find((p) => p.id === dialogData.phaseId)
    dispatch(
      setAppFlags({ dialogData: null, activePhase: { ...activePhase, name } })
    )
    dispatch(updateStreetData({ phases })) // TODO: Make reducer for phases
    closeDialog()
  }

  return (
    <Dialog>
      {(closeDialog) => {
        return (
          <div className="phaseRename-dialog">
            <header>
              <h1>
                <FormattedMessage
                  id="dialogs.phaseRename.heading"
                  defaultMessage="Rename Phase"
                />
              </h1>
              <h2>{dialogData?.phaseName}</h2>
            </header>
            <div className="dialog-content">
              <form
                onSubmit={handleSubmit((data) => onSubmit(data, closeDialog))}
              >
                <input
                  name="name"
                  id="phase-new-name"
                  placeholder=""
                  {...register('name', { required: true })}
                />

                <Button primary={true} type="submit" style={{ width: '100%' }}>
                  <FormattedMessage
                    id="dialogs.phaseRename.update"
                    defaultMessage="Update"
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

export default PhaseRenameDialog
