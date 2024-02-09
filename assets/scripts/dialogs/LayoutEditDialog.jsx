import React from 'react'
import { FormattedMessage } from 'react-intl'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'

import { saveStreetToServer } from '../streets/xhr'
import { updateStreetData } from '../store/slices/street'
import { setAppFlags } from '../store/slices/app'
import Button from '../ui/Button'
import Dialog from './Dialog'
import './LayoutEditDialog.scss'

const LayoutEditDialog = (props) => {
  const { register, handleSubmit } = useForm({
    shouldUseNativeValidation: true
  })

  const dispatch = useDispatch()
  const street = useSelector((state) => state.street)
  const { dialogData } = useSelector((state) => state.app)

  const onSubmit = (data, closeDialog) => {
    const { name } = data
    const phases = Object.entries(data).filter(([key]) =>
      key.includes('phase_')
    )

    const newLayouts = street.layouts.map((layout) => {
      if (layout.id === dialogData.layout.id) {
        return {
          ...layout,
          name,
          phases: phases
            .map(([key, value]) => (value ? key.split('_')[1] : null))
            .filter(Boolean)
        }
      }

      return layout
    })

    const layout = newLayouts.find(
      (layout) => layout.id === dialogData.layout.id
    )
    dispatch(
      updateStreetData({
        phases: street.phases.map((phase) => ({
          ...phase,
          street: { ...phase.street, layouts: newLayouts }
        })),
        layouts: newLayouts
      })
    )
    dispatch(setAppFlags({ activeLayout: layout }))
    saveStreetToServer()
    closeDialog()
  }

  return (
    <Dialog>
      {(closeDialog) => {
        return (
          <div className="layout-edit-dialog">
            <header>
              <h1>
                <FormattedMessage
                  id="dialogs.layoutEdit.heading"
                  defaultMessage="Edit Layout"
                />
              </h1>
              <h2>{dialogData.layout.name}</h2>
            </header>
            <div className="dialog-content">
              <form
                onSubmit={handleSubmit((data) => onSubmit(data, closeDialog))}
              >
                <input
                  name="name"
                  id="layout-new-name"
                  placeholder="Name"
                  defaultValue={dialogData?.layout.name}
                  {...register('name', { required: true })}
                />

                <hr />
                <strong style={{ textAlign: 'center' }}>
                  <FormattedMessage
                    id="dialogs.layoutEdit.phases"
                    defaultMessage="Phases"
                  />
                </strong>
                {dialogData.phases?.map((phase) => (
                  <div key={phase.id}>
                    <input
                      type="checkbox"
                      id={phase.id}
                      defaultChecked={dialogData.layout.phases.includes(
                        phase.id
                      )}
                      {...register(`phase_${phase.id}`)}
                    />
                    <label htmlFor={phase.id}>{phase.name}</label>
                  </div>
                ))}

                <Button primary={true} type="submit" style={{ width: '100%' }}>
                  <FormattedMessage
                    id="dialogs.layoutEdit.update"
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

export default LayoutEditDialog
