import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SplitScreenComparison } from './components/SplitScreenComparison'
import { SmeView } from './components/SmeView'
import { LenderViewPage } from './components/LenderView'
import { DoublePledgeBlocked } from './components/DoublePledgeBlocked'
import { SmokeTestPage } from './components/SmokeTestPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<SplitScreenComparison />} />
          <Route path="sme" element={<SmeView />} />
          <Route path="lender" element={<LenderViewPage />} />
          <Route path="blocked" element={<DoublePledgeBlocked />} />
          <Route path="smoke" element={<SmokeTestPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
