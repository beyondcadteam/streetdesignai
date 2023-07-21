import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
// import { FormattedMessage } from 'react-intl'
// import { EnvelopeClosedIcon, ExternalLinkIcon } from '@radix-ui/react-icons'

import { useIntl } from 'react-intl'
import {
  PencilIcon,
  PlusIcon,
  StackIcon,
  TrashIcon
} from '@primer/octicons-react'

import { saveStreetToServerIfNecessary } from '../streets/data_model'
import Icon from '../ui/Icon'
// import ExternalLink from '../ui/ExternalLink'
// import { showDialog } from '../store/slices/dialogs'
import { updateStreetData } from '../store/slices/street'
import { setAppFlags } from '../store/slices/app'
import Menu from './Menu'
import './PhasesMenu.scss'

function PhasesMenu (props) {
  const dispatch = useDispatch()
  const intl = useIntl()

  const app = useSelector((state) => state.app)
  const street = useSelector((state) => state.street)
  const [phases, setPhases] = useState()

  useEffect(() => {
    if (!phases && street.phases) {
      setPhases(street.phases)
      dispatch(setAppFlags({ activePhase: street.phases[0] }))
      const newStreet = { ...street.phases[0].street }
      console.log({ newStreet })
      setTimeout(
        () =>
          dispatch(updateStreetData({ ...newStreet, phases: street.phases })),
        250
      )
      return
    }

    if (!street.phases || street.phases.length === 0 || !phases) return

    let phasesEqual = true
    if (street.phases.length !== phases.length) phasesEqual = false

    street.phases.forEach((phase, index) => {
      const inPhase = phases.find((p) => p.id === phase.id)
      if (!inPhase || inPhase.name !== phase.name) phasesEqual = false
    })

    if (!phasesEqual) {
      setPhases(street.phases)
      dispatch(updateStreetData({ phases: street.phases }))
      setTimeout(saveStreetToServerIfNecessary, 250)
    }
  }, [street.phases, phases, dispatch])

  useEffect(() => {
    if (!app.activePhase) {
      if (street?.phases?.length > 0) {
        dispatch(setAppFlags({ activePhase: street.phases[0] }))
      } else {
        const defaultPhase = [
          {
            id: street.id + `:${Date.now().toString(36).slice(2)}`,
            name:
              street.name ||
              intl.formatMessage({
                id: 'street.default-name',
                defaultMessage: 'Unnamed St'
              }) + ' : Phase 1',
            street
          }
        ]

        dispatch(updateStreetData({ phases: defaultPhase }))
        dispatch(setAppFlags({ activePhase: defaultPhase[0] }))
        saveStreetToServerIfNecessary()
      }
    } else {
      const streetEqual =
        JSON.stringify({ ...app.activePhase.street, phases: null }) ===
        JSON.stringify({ ...street, phases: null })

      if (!streetEqual) {
        const phases = JSON.parse(JSON.stringify(street.phases))
        const index = phases.findIndex(
          (phase) => phase.id === app.activePhase.id
        )
        phases[index] = { ...app.activePhase, street }
        dispatch(updateStreetData({ phases }))
        dispatch(setAppFlags({ activePhase: { ...app.activePhase, street } }))
      }
    }
  }, [app.activePhase, street, dispatch, intl])

  function moveUp (index) {
    const newItems = [...street.phases]
    const item = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = item
    dispatch(updateStreetData({ phases: newItems }))
    if (app.activePhase === index) { dispatch(setAppFlags({ activePhase: street.phases[index - 1] })) }
  }

  function moveDown (index) {
    const newItems = [...street.phases]
    const item = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = item
    dispatch(updateStreetData({ phases: newItems }))
    if (app.activePhase === index) { dispatch(setAppFlags({ activePhase: street.phases[index + 1] })) }
  }

  function addPhase () {
    if (street?.phases?.length >= process.env.PHASE_LIMIT) return
    const newItems = [...street.phases].map((phase) => ({
      ...phase,
      street: { ...phase.street, phases: null }
    }))
    const streetName =
      street.name ||
      intl.formatMessage({
        id: 'street.default-name',
        defaultMessage: 'Unnamed St'
      })
    const clonedStreet = JSON.parse(JSON.stringify({ ...street, phases: null }))

    newItems.push({
      id: street.id + `:${Date.now().toString(36).slice(2)}`,
      name: `${streetName} : Phase ${newItems.length + 1}`,
      street: clonedStreet
    })

    dispatch(updateStreetData({ phases: newItems }))
    dispatch(setAppFlags({ activePhase: newItems[newItems.length - 1] }))
  }

  function deletePhase (index) {
    const newItems = [...street.phases]
    newItems.splice(index, 1)
    dispatch(updateStreetData({ phases: newItems }))
    if (app.activePhase === index) { dispatch(setAppFlags({ activePhase: newItems[index - 1] })) }
  }

  function editPhase (index) {
    const newItems = [...street.phases]
    const item = newItems[index]
    const newName = window.prompt('Enter a new name for this phase', item.name)
    if (!newName) return
    newItems[index] = { ...item, name: newName }
    dispatch(setAppFlags({ activePhase: newItems[index] }))
    dispatch(updateStreetData({ phases: [...newItems] }))
  }

  function selectPhase (index) {
    const clonedPhases = JSON.parse(JSON.stringify(street.phases)).map(
      (phase) => ({ ...phase, street: { ...phase.street, phases: null } })
    )

    const phase = clonedPhases[index]
    if (!phase) return

    dispatch(setAppFlags({ activePhase: phase }))
    dispatch(updateStreetData({ ...phase.street, phases: clonedPhases }))
  }

  return (
    <Menu {...props}>
      <div className="phases-menu">
        <span style={{ marginRight: '1rem' }}>
          <StackIcon size={24} />
        </span>
        <h1 style={{ margin: 0, display: 'inline' }}>Phases</h1>
        <span
          title={intl.formatMessage({
            id: 'phases.addPhase',
            defaultMessage: 'Add Phase'
          })}
          onClick={addPhase}
          style={{
            display:
              street?.phases?.length === Number(process.env.PHASE_LIMIT || '8')
                ? 'none'
                : 'inline',
            cursor: 'pointer',
            marginLeft: '1rem'
          }}
        >
          <PlusIcon size={24} />
        </span>
        <hr />

        {street?.phases?.map((item, index) => (
          <div key={index} className="phases-menu-item">
            <div className="phases-menu-item-icons">
              <span
                title={intl.formatMessage({
                  id: 'phases.deletePhase',
                  defaultMessage: 'Delete Phase'
                })}
                onClick={() => deletePhase(index)}
                className="phases-menu-delete-item"
                style={{
                  display: street?.phases?.length === 1 ? 'none' : 'inline'
                }}
              >
                <TrashIcon size={16} />
              </span>

              <span
                title={intl.formatMessage({
                  id: 'phases.editPhaseName',
                  defaultMessage: 'Edit Phase Name'
                })}
                onClick={() => editPhase(index)}
                className="phases-menu-edit-item"
              >
                <PencilIcon size={16} />
              </span>

              {index !== 0
                ? (
                  <span
                    onClick={() => moveUp(index)}
                    className="phases-menu-move-item"
                  >
                    <Icon icon="up" />
                  </span>
                  )
                : (
                  <span className="phases-menu-move-item">&nbsp;</span>
                  )}

              {index !== street.phases.length - 1
                ? (
                  <span
                    onClick={() => moveDown(index)}
                    className="phases-menu-move-item"
                  >
                    <Icon icon="down" />
                  </span>
                  )
                : (
                  <span className="phases-menu-move-item">&nbsp;</span>
                  )}
            </div>

            <span
              onClick={() => selectPhase(index)}
              className="phases-menu-item-text"
              style={{
                cursor: 'pointer',
                fontWeight:
                  app.activePhase?.id === item?.id ? 'bold' : 'normal',
                textDecoration:
                  app.activePhase?.id === item?.id ? 'underline' : 'none'
              }}
            >
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </Menu>
  )
}

export default React.memo(PhasesMenu)
