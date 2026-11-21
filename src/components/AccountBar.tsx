import type { SignedInUser } from '../data'

interface AccountBarProps {
  user: SignedInUser
  signOutDisabled: boolean
  onSignOut: () => void
}

export function AccountBar({ user, signOutDisabled, onSignOut }: AccountBarProps) {
  return (
    <div className="account">
      <span className="avatar" aria-hidden="true">
        {user.name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="account-name">
        {user.name}
        <small>{user.email}</small>
      </span>
      <button type="button" className="ghost-button small-button" onClick={onSignOut} disabled={signOutDisabled}>
        Sign out
      </button>
    </div>
  )
}
