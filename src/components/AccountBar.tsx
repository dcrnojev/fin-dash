import type { SignedInUser } from '../data'

interface AccountBarProps {
  user: SignedInUser
  signOutDisabled: boolean
  onSignOut: () => void
}

export function AccountBar({ user, signOutDisabled, onSignOut }: AccountBarProps) {
  return (
    <div className="account-bar">
      <span className="account-name">
        Signed in as <strong>{user.name}</strong> <span className="muted">({user.email})</span>
      </span>
      <button type="button" onClick={onSignOut} disabled={signOutDisabled}>
        Sign out
      </button>
    </div>
  )
}
