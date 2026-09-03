import { company } from '../../Model/site.js'

/* Bedrift, until there is one: the box holds the section's place and says
   so, the way the fifth portrait does. */
export default function PendingSection() {
  return (
    <div className="topic__pending">
      <span className="topic__pending-label">{company.pendingLabel}</span>
    </div>
  )
}
