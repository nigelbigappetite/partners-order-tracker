'use client'

interface TimelineEvent {
  date: string
  action: string
  description?: string
}

interface TimelineProps {
  events: TimelineEvent[]
}

export default function Timeline({ events }: TimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex items-start space-x-4">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            {index < events.length - 1 && (
              <div className="mt-2 h-8 w-0.5 bg-gray-200" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-gray-900">{event.action}</p>
            {event.description && (
              <p className="mt-1 text-sm text-gray-500">{event.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">{event.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

