import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { IntlProvider } from 'react-intl'
import { DndProvider } from 'react-dnd'
import { DirectionProvider } from '@radix-ui/react-direction'
import MultiBackend from 'react-dnd-multi-backend'
import HTML5toTouch from 'react-dnd-multi-backend/dist/esm/HTML5toTouch'
import NOTIFICATION from '../../../app/data/notification.json'
import MenusContainer from '../menus/MenusContainer'
import StreetNameplateContainer from '../streets/StreetNameplateContainer'
import InfoBubble from '../info_bubble/InfoBubble'
import PaletteContainer from '../palette/PaletteContainer'
import DialogRoot from '../dialogs/DialogRoot'
import EnvironmentEditor from '../streets/EnvironmentEditor'
import Gallery from '../gallery/Gallery'
import SegmentDragLayer from '../segments/SegmentDragLayer'
import DebugHoverPolygon from '../info_bubble/DebugHoverPolygon'
import ToastContainer from '../ui/Toasts/ToastContainer'
// import SentimentSurveyContainer from '../sentiment/SentimentSurveyContainer'
import { recalculateWidth } from '../streets/width'
import { getInitialFlags } from '../store/slices/flags'
import DebugInfo from './DebugInfo'
import BlockingShield from './BlockingShield'
import BlockingError from './BlockingError'
import StreetView from './StreetView'
import LayoutView from './LayoutView'
import PrintContainer from './PrintContainer'
import WelcomePanel from './WelcomePanel'
import NotificationBar from './NotificationBar'
import { setStreetSectionTop } from './window_resize'
import Loading from './Loading'

function App () {
  const [isLoading, setLoading] = useState(true)
  const locale = useSelector((state) => state.locale)
  const dir = useSelector((state) => state.app.contentDirection)
  const layoutMode = useSelector((state) => state.app.layoutMode)
  const everythingLoaded = useSelector((state) => state.app.everythingLoaded)
  const colorMode = useSelector((state) => state.settings.colorMode)
  const dispatch = useDispatch()

  // TODO: Move other initialization methods here.
  useEffect(() => {
    const init = async () => {
      // Initialize feature flags
      await dispatch(getInitialFlags())

      // Turn off loading after initial loading is done
      setLoading(false)
    }

    window.addEventListener('message', (e) => {
      if (e?.data !== 'get-url') return
      parent.postMessage({ url: window.location.href }, '*')
    })

    // Initialize street channel
    window.streetChannel = new BroadcastChannel('street')
    window.streetChannel.onmessage = (e) => {
      console.log('Received message from street channel:', e)
    }

    const ephemeralUserID =
      window.localStorage.getItem('ephemeral-user-id') || crypto.randomUUID()
    window.localStorage.setItem('ephemeral-user-id', ephemeralUserID)
    console.log({ ephemeralUserID })

    init()

    // Add hacky Automix training data labeling
    window.validateTrainingData = async () => {
      const trainingServer = 'http://localhost:9292'

      let page = 1
      while (true) {
        const response = await fetch(`${trainingServer}/unvalidated/1`)
        const data = await response.json()
        console.log({ page, data })
        if (data?.length === 0) break

        const streets = data
          .map((street) => ({ ...street, ...recalculateWidth(street) }))
          .map((street) => {
            const valid = street.segments.every((segment) => {
              return segment.warnings.every((warning) => !warning)
            })

            return {
              ...street,
              valid
            }
          })

        console.group(`Page ${page}`)

        console.log(
          'Valid streets:',
          streets.filter((street) => street.valid).length
        )
        console.log(
          'Invalid streets:',
          streets.filter((street) => !street.valid).length
        )
        await fetch(`${trainingServer}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ streets })
        })

        console.groupEnd()
        page++
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // After loading, do ancient DOM stuff
  useEffect(() => {
    if (!isLoading && everythingLoaded) {
      setStreetSectionTop()
    }
  }, [isLoading, everythingLoaded])

  // Set color mode on top level DOM element
  useEffect(() => {
    document.querySelector('html').dataset.colorMode = colorMode
  }, [colorMode])

  return (
    <>
      <Loading isLoading={isLoading || !everythingLoaded} />
      {!isLoading && everythingLoaded && (
        <DirectionProvider dir={dir}>
          <IntlProvider
            locale={locale.locale}
            key={locale.locale}
            messages={locale.messages}
          >
            {/* The prop context={window} prevents crash errors with hot-module reloading */}
            <DndProvider
              backend={MultiBackend}
              options={HTML5toTouch}
              context={window}
            >
              {/* DndProvider allows multiple children; IntlProvider does not */}
              <NotificationBar notification={NOTIFICATION} />
              <BlockingShield />
              <BlockingError />
              <Gallery />
              <DialogRoot />
              <DebugInfo />
              <PrintContainer />
              <div className="main-screen">
                <MenusContainer />
                <StreetNameplateContainer />
                <InfoBubble />
                <DebugHoverPolygon />
                <WelcomePanel />
                {layoutMode
                  ? (
                    <LayoutView />
                    )
                  : (
                    <>
                      <PaletteContainer />
                      <EnvironmentEditor />
                      <SegmentDragLayer />
                      <StreetView />
                    </>
                    )}
                <ToastContainer />
                {/* <SentimentSurveyContainer /> */}
              </div>
            </DndProvider>
          </IntlProvider>
        </DirectionProvider>
      )}
    </>
  )
}

export default App
