export function FilterControls({
  type,
  status,
  sort,
}: {
  type: string;
  status: string;
  sort: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
      <select name="type" defaultValue={type} className="hud-select max-w-full">
        <option value="ALL">All Types</option>
        <option value="MISSING">Missing</option>
        <option value="WANTED">Wanted</option>
        <option value="KIDNAPPING">Kidnapping</option>
        <option value="UNIDENTIFIED">Unidentified</option>
        <option value="SEEKING_INFORMATION">Seeking information</option>
        <option value="TERRORIST">Terrorist</option>
        <option value="HOMICIDE">Homicide</option>
        <option value="DISAPPEARANCE">Disappearance</option>
        <option value="UNKNOWN">Unknown</option>
        <option value="OTHER">Other</option>
      </select>
      <select name="status" defaultValue={status} className="hud-select max-w-full">
        <option value="ALL">All Statuses</option>
        <option value="OPEN">Open</option>
        <option value="COLD">Cold</option>
        <option value="UNSOLVED">Unsolved</option>
        <option value="CLOSED">Closed</option>
      </select>
      <select name="sort" defaultValue={sort} className="hud-select max-w-full">
        <option value="updated">Sort: Updated</option>
        <option value="recent">Sort: Recent</option>
        <option value="code">Sort: Case ID</option>
        <option value="title">Sort: Title</option>
      </select>
    </div>
  );
}
