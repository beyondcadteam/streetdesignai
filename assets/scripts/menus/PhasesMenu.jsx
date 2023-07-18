import React, { useState } from 'react'
// import { useDispatch } from 'react-redux'
// import { FormattedMessage } from 'react-intl'
// import { EnvelopeClosedIcon, ExternalLinkIcon } from '@radix-ui/react-icons'

import Icon from '../ui/Icon'
// import ExternalLink from '../ui/ExternalLink'
// import { showDialog } from '../store/slices/dialogs'
import Menu from './Menu'
import './PhasesMenu.scss'

function PhasesMenu (props) {
  // const dispatch = useDispatch()
  const [items, setItems] = useState([
    'Phase 1',
    'Phase 2',
    'Phase 3',
    'Phase 4',
    'Phase 5'
  ])

  function moveUp (index) {
    console.log('up', index)
    const newItems = [...items]
    const item = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = item
    setItems(newItems)
  }

  function moveDown (index) {
    console.log('down', index)
    const newItems = [...items]
    const item = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = item
    setItems(newItems)
  }

  return (
    <Menu {...props}>
      <div className="phases-menu">
        <h1 style={{ margin: 0 }}>Phases</h1>
        <hr />
        {items.map((item, index) => (
          <div key={index} className="phases-menu-item">
            <div className="phases-menu-item-icons">
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

              {index !== items.length - 1
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
            <span className="phases-menu-item-text">{item}</span>
          </div>
        ))}
      </div>
    </Menu>
  )
}

export default React.memo(PhasesMenu)
