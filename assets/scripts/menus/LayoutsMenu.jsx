import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { useIntl } from 'react-intl'
import {
  PencilIcon,
  PlusIcon,
  RowsIcon,
  TrashIcon
} from '@primer/octicons-react'

import Icon from '../ui/Icon'
import { updateStreetData } from '../store/slices/street'
import { setAppFlags } from '../store/slices/app'
import { showDialog } from '../store/slices/dialogs'
import Menu from './Menu'
import './LayoutsMenu.scss'

function LayoutsMenu (props) {
  const dispatch = useDispatch()
  const intl = useIntl()

  const app = useSelector((state) => state.app)
  const street = useSelector((state) => state.street)
  const [layouts, setLayouts] = useState()

  useEffect(() => {
    window.layout = app.activeLayout
  }, [app.activeLayout])

  useEffect(() => {
    if (street?.layouts?.length > 0) {
      const newStreet = { ...street.layouts[0].street }
      dispatch(updateStreetData({ ...newStreet, layouts: street.layouts }))
      dispatch(setAppFlags({ activeLayout: street.layouts[0] }))
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!layouts && street.layouts) {
      setLayouts(street.layouts)
      dispatch(setAppFlags({ activeLayout: street.layouts[0] }))

      return
    }

    if (!street.layouts || street.layouts.length === 0 || !layouts) return

    let layoutsEqual = true
    if (street.layouts.length !== layouts.length) layoutsEqual = false

    street.layouts.forEach((layout, index) => {
      const inLayout = layouts.find((p) => p.id === layout.id)
      if (!inLayout || inLayout.name !== layout.name) layoutsEqual = false
    })

    if (!layoutsEqual) setLayouts(street.layouts)
  }, [street.layouts, layouts, dispatch])

  useEffect(() => {
    if (!app.activeLayout) {
      if (street?.layouts?.length > 0) {
        dispatch(setAppFlags({ activeLayout: street.layouts[0] }))
      } else {
        const defaultLayout = [
          {
            id: street.id + `:layout-${Date.now().toString(36).slice(2)}`,
            phases: [],
            name:
              street.name ||
              intl.formatMessage({
                id: 'street.default-name',
                defaultMessage: 'Unnamed St'
              }) + ' : Layout 1'
          }
        ]

        dispatch(updateStreetData({ layouts: defaultLayout }))
        dispatch(setAppFlags({ activeLayout: defaultLayout[0] }))
      }
    }
  }, [app.activeLayout, street, dispatch, intl])

  function moveUp (index) {
    const newItems = [...street.layouts]
    const item = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = item

    dispatch(
      updateStreetData({
        phases: street.phases.map((phase) => ({
          ...phase,
          street: { ...phase.street, layouts: newItems }
        })),
        layouts: newItems
      })
    )
    if (app.activeLayout === index) {
      dispatch(setAppFlags({ activeLayout: street.layouts[index - 1] }))
    }
  }

  function moveDown (index) {
    const newItems = [...street.layouts]
    const item = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = item

    dispatch(
      updateStreetData({
        phases: street.phases.map((phase) => ({
          ...phase,
          street: { ...phase.street, layouts: newItems }
        })),
        layouts: newItems
      })
    )
    if (app.activeLayout === index) {
      dispatch(setAppFlags({ activeLayout: street.layouts[index + 1] }))
    }
  }

  function addLayout () {
    if (street?.layouts?.length >= process.env.LAYOUT_LIMIT) return
    const newItems = [...street.layouts]

    const layout = {
      id: street.id + `:${Date.now().toString(36).slice(2)}`,
      name: `${street.name || 'Unnamed St'} : Layout ${newItems.length + 1}`,
      phases: []
    }

    newItems.push(layout)
    dispatch(
      updateStreetData({
        phases: street.phases.map((phase) => ({
          ...phase,
          street: { ...phase.street, layouts: newItems }
        })),
        layouts: newItems
      })
    )
    dispatch(setAppFlags({ activeLayout: newItems[newItems.length - 1] }))
  }

  function deleteLayout (index) {
    const newItems = [...street.layouts]
    newItems.splice(index, 1)

    dispatch(
      updateStreetData({
        phases: street.phases.map((phase) => ({
          ...phase,
          street: { ...phase.street, layouts: newItems }
        })),
        layouts: newItems
      })
    )
    if (app.activeLayout === index) {
      dispatch(setAppFlags({ activeLayout: newItems[index - 1] }))
    }
  }

  function editLayout (index) {
    const newItems = [...street.layouts]
    const item = newItems[index]

    dispatch(
      setAppFlags({
        dialogData: {
          layout: item,
          phases: street.phases?.map((phase) => ({
            ...phase,
            street: { ...phase.street, phases: null }
          }))
        }
      })
    )

    dispatch(showDialog('LAYOUT_EDIT'))

    setTimeout(() => {
      document.querySelector('#layout-new-name').focus()
    }, 50)
  }

  function selectLayout (index) {
    const layout = street.layouts[index]
    if (!layout) return

    dispatch(setAppFlags({ activeLayout: layout }))
  }

  function toggleLayoutMode () {
    dispatch(setAppFlags({ layoutMode: !app.layoutMode }))
  }

  return (
    <Menu {...props}>
      <div className="layouts-menu">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span style={{ marginRight: '1rem' }}>
              <RowsIcon size={24} />
            </span>
            <h1 style={{ margin: 0, display: 'inline', userSelect: 'none' }}>
              Layouts
            </h1>

            <span
              title={intl.formatMessage({
                id: 'layouts.addLayout',
                defaultMessage: 'Add Layout'
              })}
              onClick={addLayout}
              style={{
                display:
                  street?.layouts?.length ===
                  Number(process.env.LAYOUT_LIMIT || '8')
                    ? 'none'
                    : 'inline',
                cursor: 'pointer',
                marginLeft: '1rem'
              }}
            >
              <PlusIcon size={24} />
            </span>
          </div>

          <span
            onClick={toggleLayoutMode}
            style={{
              position: 'relative',
              cursor: 'pointer',
              marginLeft: '1rem',
              top: '10px'
            }}
          >
            {/* {app.layoutMode ? <EyeClosedIcon size={20} /> : <EyeIcon size={20} />} */}
            {intl.formatMessage({
              id: app.layoutMode
                ? 'layouts.exitLayoutMode'
                : 'layouts.enterLayoutMode',
              defaultMessage: app.layoutMode
                ? 'Exit Layout Mode'
                : 'Enter Layout Mode'
            })}
          </span>
        </div>

        <hr />

        {street?.layouts?.map((item, index) => (
          <div key={index} className="layouts-menu-item">
            <div className="layouts-menu-item-icons">
              <span
                title={intl.formatMessage({
                  id: 'layouts.deleteLayout',
                  defaultMessage: 'Delete Layout'
                })}
                onClick={() => deleteLayout(index)}
                className="layouts-menu-delete-item"
                style={{
                  display: street?.layouts?.length === 1 ? 'none' : 'inline'
                }}
              >
                <TrashIcon size={16} />
              </span>

              <span
                title={intl.formatMessage({
                  id: 'layouts.editLayout',
                  defaultMessage: 'Edit Layout'
                })}
                onClick={() => editLayout(index)}
                className="layouts-menu-edit-item"
              >
                <PencilIcon size={16} />
              </span>

              {index !== 0
                ? (
                  <span
                    onClick={() => moveUp(index)}
                    className="layouts-menu-move-item"
                  >
                    <Icon icon="up" />
                  </span>
                  )
                : (
                  <span className="layouts-menu-move-item">&nbsp;</span>
                  )}

              {index !== street.layouts.length - 1
                ? (
                  <span
                    onClick={() => moveDown(index)}
                    className="layouts-menu-move-item"
                  >
                    <Icon icon="down" />
                  </span>
                  )
                : (
                  <span className="layouts-menu-move-item">&nbsp;</span>
                  )}
            </div>

            <span
              onClick={() => selectLayout(index)}
              className="layouts-menu-item-text"
              style={{
                cursor: 'pointer',
                fontWeight:
                  app.activeLayout?.id === item?.id ? 'bold' : 'normal',
                textDecoration:
                  app.activeLayout?.id === item?.id ? 'underline' : 'none'
              }}
            >
              {item.name} &bull; ({item.phases?.length ?? 0}{' '}
              {intl.formatMessage({
                id:
                  item.phases?.length !== 1
                    ? 'layouts.phases'
                    : 'layouts.phase',
                defaultMessage: item.phases?.length !== 1 ? 'Phases' : 'Phase'
              })}
              )
            </span>
          </div>
        ))}
      </div>
    </Menu>
  )
}

export default React.memo(LayoutsMenu)
