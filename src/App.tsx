import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import HomePage from "./pages/homepage"
import "./App.css"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  )
}

export default App
