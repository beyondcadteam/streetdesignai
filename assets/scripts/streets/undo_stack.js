import { cloneDeep } from 'lodash'

import { trackEvent } from '../app/event_tracking'
import { t } from '../app/locale'
import { showStatusMessage, hideStatusMessage } from '../app/status_message'
import { infoBubble } from '../info_bubble/info_bubble'
import {
  trimStreetData,
  getStreet,
  setStreet,
  setUpdateTimeToNow,
  updateEverything
} from './data_model'
import { getRemixOnFirstEdit } from './remix'

import store from '../store'
import {
  createNewUndo,
  unifyStack,
  undoAction,
  redoAction
} from '../store/actions/undo'

export function getCurrentUndo () {
  const state = store.getState().undo
  return state.stack[state.position]
}

export function getUndoStack () {
  return cloneDeep(store.getState().undo.stack)
}

export function getUndoPosition () {
  return store.getState().undo.position
}

function finishUndoOrRedo () {
  // set current street to the thing we just updated
  const state = store.getState().undo
  setStreet(cloneDeep(state.stack[state.position]))

  setUpdateTimeToNow()

  infoBubble.hide()
  infoBubble.hideSegment()
  infoBubble.dontConsiderShowing()

  updateEverything(true)
  hideStatusMessage()

  trackEvent('INTERACTION', 'UNDO', null, null, true)
}

export function undo () {
  if (!isUndoAvailable()) {
    showStatusMessage(t('toast.no-undo'))
    return
  }

  // sends current street to update current position before undoing
  store.dispatch(undoAction(trimStreetData(getStreet())))

  finishUndoOrRedo()
}

export function redo () {
  if (!isRedoAvailable()) {
    showStatusMessage(t('toast.no-undo'))
    return
  }

  store.dispatch(redoAction())

  finishUndoOrRedo()
}

export function createNewUndoIfNecessary (lastStreet, currentStreet) {
  if (lastStreet.name !== currentStreet.name) {
    return
  }

  store.dispatch(createNewUndo(cloneDeep(lastStreet)))
}

export function isUndoAvailable () {
  const undoPosition = getUndoPosition()
  // Don’t allow undo/redo unless you own the street
  return (undoPosition > 0) && !getRemixOnFirstEdit()
}

export function isRedoAvailable () {
  const undoStack = getUndoStack()
  const undoPosition = getUndoPosition()
  // Don’t allow undo/redo unless you own the street
  return (undoPosition >= 0 && undoPosition < undoStack.length - 1) && !getRemixOnFirstEdit()
}

export function unifyUndoStack () {
  const street = store.getState().street
  store.dispatch(unifyStack(street))
}
