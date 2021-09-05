import fetch from "node-fetch";
import cheerio, { CheerioAPI } from "cheerio";

function getItemprop($: CheerioAPI, propname: string) {
  const propEls = $(`[itemprop="${propname}"]`);
  const prop = propEls.length > 0 ? $(propEls[0]).text() : "";
  return prop;
}
function trimHtmlWhitespace(str: string) {
  return str
    .replace(/\n/g, "")
    .replace(/[\t ]+\</g, "<")
    .replace(/\>[\t ]+\</g, "><")
    .replace(/\>[\t ]+$/g, ">");
}

interface HealthpointLocation {
  lat: number;
  lng: number;
  name: string;
  id: number;
  url: string;
  branch: "primary" | "pharmacy" | "community";
}
interface Data {
  results: HealthpointLocation[];
}

async function fetchHealthpointLocation(
  healthpointLocation: HealthpointLocation
) {
  const fullUrl = `https://www.healthpoint.co.nz${healthpointLocation.url}`;
  const res = await fetch(fullUrl);
  const body = await res.text();
  const $ = cheerio.load(body);
  const table = $("table.hours");
  // const opennningHours = new Map<string, string>();
  const opennningHours: Record<string, string> = {}
  $(table)
    .find("tr")
    .each((i, tr) => {
      const day = $(tr).find("th").text();
      const hours = $(tr).find("td").text();

      opennningHours[day] = hours;
    });

  const name = $("#heading h1").text();
  const address = $('[itemtype="http://schema.org/Place"] h3').text();

  const telephone = getItemprop($, "telephone");
  const faxNumber = getItemprop($, "faxNumber");

  let instruction = $("#section-covidVaccination .content").html();
  instruction = instruction ? trimHtmlWhitespace(instruction.trim()) : "";
  const bookButton = $("#section-covidVaccinationBookingUrl");

  const instructionUl = $("#section-covidVaccination .content ul:first");
  const instructionLisEls = $(instructionUl).find("li");
  const instructionLis = instructionLisEls.map((i, li) => $(li).text()).get();

  const isBookable = bookButton.length > 0;

  return {
    ...healthpointLocation,
    fullUrl,
    name,
    opennningHours,
    address,
    telephone,
    faxNumber,
    instruction,
    instructionLis,
    isBookable,
  };
}

async function main() {
  const res = await fetch(
    "https://www.healthpoint.co.nz/geo.do?zoom=22&minLat=-50.054063301361936&maxLat=-30.13148344991528&minLng=97.2021141875&maxLng=-110.4834326875&lat=&lng=&region=&addr=&branch=covid-19-vaccination&options=anyone",
    {}
  );
  const data = await res.json() as Data
  const results = data.results;

  const branches = [];
  for (const healthpointLocation of results) {
    branches.push(healthpointLocation.branch);
    const healthpointLocationWithHours = await fetchHealthpointLocation(healthpointLocation)
    // console.log(JSON.stringify(healthpointLocationWithHours))
    console.log(healthpointLocationWithHours)
  }
  // console.log(new Set([...branches]));
  // const firstHealthpointLocation = results[2]
  // const enrichedHpLocation = await fetchHealthpointLocation(firstHealthpointLocation)
  // console.log('enrichedHpLocation',enrichedHpLocation)
}

main();
