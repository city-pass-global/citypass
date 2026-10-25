export type PassportStamp = {
  id: string;
  destinationId: string;
  destination: string;
  name: string;
  date: string;
};

/** Keep each verified claim exactly once, grouped by destination in collection order. */
export function passportStampPages(stamps: PassportStamp[]) {
  const destinations = new Map<string, PassportStamp[]>();
  for (const stamp of stamps) {
    const group = destinations.get(stamp.destinationId) ?? [];
    group.push(stamp);
    destinations.set(stamp.destinationId, group);
  }
  return [...destinations.entries()].flatMap(([id, group]) => {
    const pages = [];
    for (let index = 0; index < group.length; index += 4) {
      pages.push({
        id: `${id}-${index}`,
        destination: group[0].destination,
        stamps: group.slice(index, index + 4),
      });
    }
    return pages;
  });
}
