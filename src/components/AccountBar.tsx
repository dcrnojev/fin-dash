import type { SignedInUser } from '../data'

interface AccountBarProps {
  user: SignedInUser
  onSignOut: () => void
}

export function AccountBar({ user, onSignOut }: AccountBarProps) {
  return (
    <div className="account-bar">
      <span className="account-name">
        Signed in as <strong>{user.name}</strong> <span className="muted">({user.email})</span>
      </span>
      <button type="button" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  )
}
