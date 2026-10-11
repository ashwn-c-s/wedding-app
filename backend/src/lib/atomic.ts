export function atomicError(error:{code?:string;message?:string},fallback:string,duplicate:string):{status:number;error:string} {
  if(error.code==='23505') return {status:409,error:duplicate};
  if(error.code==='P0001') {
    const messages:Record<string,[number,string]>={
      INVALID_GUEST:[400,'Invalid guest details'],
      INVALID_EVENTS:[400,'An event no longer exists or the selected events are invalid. Refresh and choose again.'],
      GUEST_NOT_FOUND:[404,'Guest not found'],
      IMPORT_ASSIGNMENTS_DIFFER:[409,'Existing event assignments differ; edit this guest individually instead.'],
      IMPORT_DETAILS_LOCKED:[409,'Confirmed guest details are locked for CSV imports'],
      GUEST_RSVP_LOCKED:[409,'This guest has already submitted an RSVP. Keep their invited events unchanged; their details can still be edited.'],
      RSVP_ALREADY_SUBMITTED:[409,'RSVP already submitted'],
      INVALID_RESPONSES:[400,'Choose a response for every invited event'],
      EVENT_ASSIGNMENTS_CHANGED:[400,'Your invited events have changed. Refresh your invitation and respond again.'],
    };
    const message=messages[error.message || ''];
    if(message)return {status:message[0],error:message[1]};
  }
  return {status:503,error:fallback};
}
