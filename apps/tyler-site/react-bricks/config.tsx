import { types } from 'react-bricks'
import bricks from './bricks'

const config: types.ReactBricksConfig = {
  appId: process.env.NEXT_PUBLIC_REACT_BRICKS_APP_ID || '',
  apiKey: process.env.REACT_BRICKS_API_KEY || '',
  pageTypes: [
    {
      name: 'page',
      pluralName: 'pages',
      defaultLocked: false,
      defaultStatus: types.PageStatus.Published,
      getDefaultContent: () => [],
    },
  ],
  bricks,
  logo: '/logo.png',
  contentClassName: 'content',
  renderLocalLink: (props) => {
    return (
      <a href={props.href} className={props.className}>
        {props.children}
      </a>
    )
  },
  navigate: (path: string) => {
    window.location.href = path
  },
  appRootElement: '#__next',
  clickToEditSide: types.ClickToEditSide.BottomRight,
  responsiveBreakpoints: [
    { type: types.DeviceType.Phone, width: 480, label: 'Mobile' },
    { type: types.DeviceType.Tablet, width: 768, label: 'Tablet' },
    { type: types.DeviceType.Desktop, width: 1024, label: 'Desktop' },
  ],
  enableAutoSave: true,
  disableSaveIfInvalidProps: false,
  enablePreview: true,
}

export default config
