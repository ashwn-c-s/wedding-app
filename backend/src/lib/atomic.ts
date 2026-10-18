export function atomicError(error:{code?:string;message?:string},fallback:string,duplicate:string):{status:number;error:string} {
  if(error.code==='23505') return {status:409,error:duplicate};
  if(error.code==='P0001') {
    const messages:Record<string,[number,string]>={
      INVALID_TAGS:[400,'Choose up to 10 valid tags (1–40 characters, without |).'],
      TAG_NOT_FOUND:[400,'A selected tag no longer exists. Refresh the tag list and try again.'],
      TOO_MANY_TAGS:[400,'This guest would have more than 10 tags. Edit their tags individually.'],
      INVALID_LOCATION:[400,'Enter valid guest coordinates or a supported Google Maps location link.'],
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
