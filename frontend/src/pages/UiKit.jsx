import Card from '../ui/Card'
import Stat from '../ui/Stat'

const stats = [
  { label: 'Active members', value: '312', badge: '+12 this week' },
  { label: 'Wallet balance', value: 'KES 14.2M', badge: 'KES +420k today' },
  { label: 'Pending payouts', value: '17', badge: 'KES 1.1M queued' },
]

export default function UiKit() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">UI Kit & Component Preview</h1>
        <p className="text-sm text-slate-500">
          Reference playground for designers, QA, and developers.
        </p>
      </div>

      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Stats</p>
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Stat key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cards</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Latest contribution" badge="KES 25,000" footer="Cleared via M-PESA 5min ago">
            <p className="text-sm text-slate-600">
              Member <span className="font-semibold text-slate-900">Faith K.</span> topped up their
              emergency fund goal. Receipt pending approval.
            </p>
          </Card>
          <Card title="Upcoming meeting" badge="Tomorrow 6pm EAT" footer="Hosted on Google Meet">
            <p className="text-sm text-slate-600">
              Agenda: investment realignment, quarterly audits, and scholarship fund rollout.
            </p>
          </Card>
        </div>
      </section>
    </div>
  )
}

