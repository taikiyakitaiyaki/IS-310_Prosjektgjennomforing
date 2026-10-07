import { members, projects } from '../../Model/site.js'

/* ===========================================================================
   Who made a project, as the cards say it: "Laget av" and the names in turn,
   or the whole group when it is every one of them. One wording for the 3D
   cards, the plain row and the line read out under the carousel.
   =========================================================================== */

const names = new Intl.ListFormat('nb', { type: 'conjunction' })

export function credit(by) {
  const everyone = members.people.every((person) => by.includes(person.name))
  return `${projects.byLabel} ${everyone ? projects.wholeGroup : names.format(by)}`
}
