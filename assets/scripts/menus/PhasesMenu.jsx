import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
// import { FormattedMessage } from 'react-intl'
// import { EnvelopeClosedIcon, ExternalLinkIcon } from '@radix-ui/react-icons'

import { useIntl } from 'react-intl'
import {
  LinkIcon,
  PencilIcon,
  PlusIcon,
  StackIcon,
  TrashIcon
} from '@primer/octicons-react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRandom, faRoad } from '@fortawesome/free-solid-svg-icons'

import { saveStreetToServer } from '../streets/xhr'
import Icon from '../ui/Icon'
// import ExternalLink from '../ui/ExternalLink'
// import { showDialog } from '../store/slices/dialogs'
import { updateStreetData } from '../store/slices/street'
import { setAppFlags } from '../store/slices/app'
import { showDialog } from '../store/slices/dialogs'
import './PhasesMenu.scss'
import AutoMix from '../../../app/lib/automix/automix.mjs'
import { segmentsChanged } from '../segments/view'
import Menu from './Menu'

function PhasesMenu (props) {
  const dispatch = useDispatch()
  const intl = useIntl()

  const app = useSelector((state) => state.app)
  const street = useSelector((state) => state.street)
  const [phases, setPhases] = useState()

  useEffect(() => {
    window.street = street
    window.phase = app.activePhase
  }, [app.activePhase, street])

  useEffect(() => {
    if (street?.phases?.length > 0) {
      const newStreet = { ...street.phases[0].street }
      dispatch(updateStreetData({ ...newStreet, phases: street.phases }))
      dispatch(setAppFlags({ activePhase: street.phases[0] }))
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!phases && street.phases) {
      setPhases(street.phases)
      dispatch(setAppFlags({ activePhase: street.phases[0] }))
      const newStreet = { ...street.phases[0].street }

      setTimeout(() => {
        dispatch(updateStreetData({ ...newStreet, phases: street.phases }))
      }, 250)

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
      saveStreetToServer()
    }
  }, [street.phases, phases, dispatch])

  useEffect(() => {
    if (!app.activePhase) {
      if (street?.phases?.length > 0) {
        dispatch(setAppFlags({ activePhase: street.phases[0] }))
      } else {
        const defaultPhase = [
          {
            id: street.id + `:phase-${Date.now().toString(36).slice(2)}`,
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
        saveStreetToServer()
      }
    } else {
      const streetEqual =
        JSON.stringify({ ...app.activePhase.street, phases: null }) ===
        JSON.stringify({ ...street, phases: null })

      if (!streetEqual && street?.phases) {
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
    if (app.activePhase === index) {
      dispatch(setAppFlags({ activePhase: street.phases[index - 1] }))
    }
  }

  function moveDown (index) {
    const newItems = [...street.phases]
    const item = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = item
    dispatch(updateStreetData({ phases: newItems }))
    if (app.activePhase === index) {
      dispatch(setAppFlags({ activePhase: street.phases[index + 1] }))
    }
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
      id: street.id + `:phase-${Date.now().toString(36).slice(2)}`,
      name: `${streetName} : Phase ${newItems.length + 1}`,
      street: clonedStreet
    })

    dispatch(updateStreetData({ phases: newItems }))
    dispatch(setAppFlags({ activePhase: newItems[newItems.length - 1] }))
  }

  function deletePhase (index) {
    const item = street.phases[index]
    const newItems = [...street.phases]
    newItems.splice(index, 1)
    const newActivePhase = newItems[index - 1] || newItems[0]

    if (app.activePhase.id === item.id) {
      dispatch(updateStreetData({ ...newActivePhase.street, phases: newItems }))
      dispatch(setAppFlags({ activePhase: newActivePhase }))
    } else {
      dispatch(updateStreetData({ phases: newItems }))
    }
  }

  function editPhase (index) {
    const newItems = [...street.phases]
    const item = newItems[index]

    dispatch(
      setAppFlags({ dialogData: { phaseId: item.id, phaseName: item.name } })
    )
    dispatch(showDialog('PHASE_RENAME'))

    setTimeout(() => {
      document.querySelector('#phase-new-name').focus()
    }, 50)
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

  function importPhase () {
    dispatch(showDialog('PHASE_IMPORT'))
    setTimeout(() => {
      document.querySelector('#phase-new-link').focus()
    }, 50)
  }

  async function createAutomix (type = 'variants') {
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

    try {
      const automix = new AutoMix(clonedStreet)

      // DEV: Check failure rate of random street generation
      // if (type === 'new') {
      //   let failures = 0
      //   let loop = 0
      //   while (loop < 100) {
      //     loop++
      //     try {
      //       await automix.create()
      //     } catch (err) {
      //       failures++
      //       console.error(err, { failures })
      //     }
      //   }
      //   console.log({ failures, rate: failures / loop })
      // }

      if (type === 'new') automix.create()
      if (type === 'variants') automix.mix()

      // console.log(automix)
      const environment = automix.street.environment
      const segments = automix.street.segments

      newItems.push({
        id: street.id + `:phase-${Date.now().toString(36).slice(2)}`,
        name: `${streetName} : AutoMix ${type === 'new' ? 'Street' : 'Phase'} ${
          newItems.length + 1
        }`,
        street: { ...clonedStreet, segments, environment }
      })

      dispatch(updateStreetData({ segments, environment, phases: newItems }))
      dispatch(setAppFlags({ activePhase: newItems[newItems.length - 1] }))
      segmentsChanged()
    } catch (err) {
      console.error(err)
      window.alert(err.message)
    }
  }

  return (
    <Menu {...props}>
      <div className="phases-menu">
        <span style={{ marginRight: '1rem' }}>
          <StackIcon size={24} />
        </span>
        <h1 style={{ margin: 0, display: 'inline', userSelect: 'none' }}>
          Phases
        </h1>
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

        <span
          title={intl.formatMessage({
            id: 'phases.importPhase',
            defaultMessage: 'Import Phase'
          })}
          onClick={importPhase}
          style={{
            display:
              street?.phases?.length === Number(process.env.PHASE_LIMIT || '8')
                ? 'none'
                : 'inline',
            cursor: 'pointer',
            marginLeft: '1rem'
          }}
        >
          <LinkIcon size={20} />
        </span>

        <span
          title={intl.formatMessage({
            id: 'phases.createAutomix',
            defaultMessage: 'Create an AutoMix Phase'
          })}
          onClick={() => createAutomix('variants')}
          style={{
            display:
              street?.phases?.length === Number(process.env.PHASE_LIMIT || '8')
                ? 'none'
                : 'inline',
            cursor: 'pointer',
            marginLeft: '1rem',
            top: '-3px',
            position: 'relative'
          }}
        >
          <FontAwesomeIcon icon={faRandom} />
        </span>

        {process.env.AUTOMIX_ENABLE_RANDOM_PHASES === 'true' && (
          <span
            title={intl.formatMessage({
              id: 'phases.generateRandomStreet',
              defaultMessage: 'Generate a new AutoMix Street'
            })}
            onClick={() => createAutomix('new')}
            style={{
              display:
                street?.phases?.length ===
                Number(process.env.PHASE_LIMIT || '8')
                  ? 'none'
                  : 'inline',
              cursor: 'pointer',
              marginLeft: '1rem',
              top: '-3px',
              position: 'relative'
            }}
          >
            <FontAwesomeIcon icon={faRoad} />
          </span>
        )}

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
