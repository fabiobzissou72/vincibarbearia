import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/auth/callback/google'
)

export const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

export const CALENDAR_IDS = {
  HIAGO: process.env.HIAGO_CALENDAR_ID!,
  ALEX: process.env.ALEX_CALENDAR_ID!,
  FILIPPE: process.env.FILIPPE_CALENDAR_ID!,
}

export async function createCalendarEvent(
  calendarId: string,
  eventData: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone: string }
    end: { dateTime: string; timeZone: string }
    attendees?: Array<{ email: string }>
  }
) {
  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventData,
    })
    return response.data
  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error)
    throw error
  }
}

export async function updateCalendarEvent(
  calendarId: string,
  eventId: string,
  eventData: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone: string }
    end: { dateTime: string; timeZone: string }
    attendees?: Array<{ email: string }>
  }
) {
  try {
    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: eventData,
    })
    return response.data
  } catch (error) {
    console.error('Erro ao atualizar evento no Google Calendar:', error)
    throw error
  }
}

export async function deleteCalendarEvent(calendarId: string, eventId: string) {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    })
  } catch (error) {
    console.error('Erro ao deletar evento no Google Calendar:', error)
    throw error
  }
}

export async function getCalendarEvents(
  calendarId: string,
  timeMin?: string,
  timeMax?: string
) {
  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })
    return response.data.items || []
  } catch (error) {
    console.error('Erro ao buscar eventos do Google Calendar:', error)
    throw error
  }
}

export function formatDateTimeForGoogle(date: string, time: string) {
  const dateTime = new Date(`${date}T${time}:00`)
  return {
    dateTime: dateTime.toISOString(),
    timeZone: 'America/Sao_Paulo',
  }
}

export function addMinutesToDateTime(dateTime: string, minutes: number) {
  const date = new Date(dateTime)
  date.setMinutes(date.getMinutes() + minutes)
  return {
    dateTime: date.toISOString(),
    timeZone: 'America/Sao_Paulo',
  }
}