// Alejandro Mozqueda
// 4/16/2024


let map, anchor = { lat: 39.53852, lng: -119.81422 };
let locations = {};
const placeSlots = Array($('.place-list').length).fill(null);

class Location {
  constructor(code, name, latitude, longitude) {
    this.code = code;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
  }
}

// ------------------------------------------------------------------------
// Section: Initialization/data fetching
// ------------------------------------------------------------------------

async function tryFetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function initData() {
  const localUrl = 'data/locations.json';
  const data = await tryFetchData(localUrl);
  if (data) return data;
  
  const url = 'https://toppersoft.com/csx91/ex3-data.js';
  const remoteData = await tryFetchData(url);
  if (remoteData) return remoteData;
}

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  map = new Map($("#map")[0], { center: anchor, zoom: 18, mapId: "UNR_QUAD" });
}

async function init() {
  await initMap();
  const data = await initData();
  if (data) {
    data
      .slice(1)
      .forEach(location => {
        locations[location[0]] = new Location(...location);
      });
  }
  for (const location in locations) {
    $('#places-0').append(`<option value="${ location }"></option>`);
    $('#places-1').append(`<option value="${ location }"></option>`);
    sortDatalistOptions(0);
    sortDatalistOptions(1);
  }
}

// ------------------------------------------------------------------------
// Section: Event listeners and helpers
// ------------------------------------------------------------------------

$('.places-input').on('input', async function () {
  const code = this.value;
  if (code > 3) {
    $(this).val(code.slice(0, 3));
    return;
  }
  
  const slotId = getSlotId(this);
  const lastCode = placeSlots[slotId];
  let otherPlaceLists = $(`.place-list:not([data-slot-id="${ slotId }"])`);
  
  if (!locations[code]) { // On invalid location code
    if (lastCode === null) return;
    
    // Add the location back to the other input lists
    otherPlaceLists.each(function () {
      const optionExists = $(this).find(`option[value="${ lastCode }"]`).length > 0;
      if (optionExists) return;
      
      $(this).append(`<option value="${ lastCode }"></option>`);
      sortDatalistOptions(getSlotId(this));
    });
    
    $(`#place-${ slotId }-name`).val('');
    placeSlots[slotId] = null;
    await removeMarker(lastCode);
    setTotalDistance();
    return;
  }
  
  if (lastCode === code) return; // Location entered is the same as the current location
  
  const location = locations[code];
  otherPlaceLists.each(function () {
    $(this).find(`option[value="${ code }"]`).remove();
  });
  
  $(`#place-${ slotId }-name`).val(location.name);
  placeSlots[slotId] = location.code;
  await addMarker(code);
  setTotalDistance();
});

$('#header-button').click(function clearAll() {
  const inputs = $('.places-input');
  inputs.val('');
  inputs.trigger('input');
});

function sortDatalistOptions(slotId) {
  let dataList = $(`#places-${ slotId }`);
  let options = $(`#places-${ slotId } option`).toArray();
  options.sort(function (a, b) {
    return a.value.localeCompare(b.value);
  });
  dataList.empty();
  options.forEach(function (option) {
    dataList.append(option);
  });
}

function getSlotId(element) {
  const slotId = parseInt($(element).attr('data-slot-id'));
  if (slotId < 0 || slotId >= placeSlots.length) {
    throw new Error('Invalid slot ID');
  }
  return slotId;
}

// ------------------------------------------------------------------------
// Section: Map markers and poly-lines
// ------------------------------------------------------------------------

let markers = {};
async function addMarker(code) {
  const location = locations[code];
  if (!location || !map || markers[location.code]) return;
  
  const contentString = `
  <style>
    #firstHeading {
      font-size: 1.25em;
    }
    #bodyContent * {
      color: #404040;
    }
  </style>
  <div id="content">
      <div id="siteNotice"></div>
      <h1 id="firstHeading" class="firstHeading">${ location.code }</h1>
      <div id="bodyContent">
          <p>${ location.name }</p>
      </div>
  </div>
`;
  
  const infoWindow = new google.maps.InfoWindow({
    content: contentString,
    maxWidth: 160,
    ariaLabel: location.code
  });
  
  const marker = new google.maps.Marker({
    map: map,
    position: { lat: location.latitude, lng: location.longitude },
    title: location.name,
    label: {
      text: code,
      color: "rgba(87,8,0,0.5)",
      fontSize: "11px",
      fontWeight: "bold"
    }
  });
  
  markers[location.code] = [marker, infoWindow];
  
  marker.addListener("click", () => {
    infoWindow.open({
      anchor: marker,
      map
    });
  });
}

function removeMarker(code) {
  if (!markers[code]) return;
  
  const [marker, infoWindow] = markers[code];
  marker.setMap(null);
  infoWindow.close();
  delete markers[code];
}

// Reset marker and infoWindow
// https://stackoverflow.com/a/74492809
function resetMarkers() {
  markers.forEach(([marker, infoWindow]) => {
    marker.map = null;
    infoWindow.close();
  });
  markers = {};
}

function setPolylines() {
  placeSlots.forEach(code => {
  
  })
}

// ------------------------------------------------------------------------
// Section: Distance calculations and conversions
// ------------------------------------------------------------------------

function setTotalDistance() {
  let distanceM = 0;
  if (placeSlots.length < 2) return;
  
  for (let i = 1; i < placeSlots.length; i++) {
    const locationFrom = locations[placeSlots[i - 1]];
    const locationTo = locations[placeSlots[i]];
    if (!locationTo || !locationFrom) break;
    
    const subDistanceM = haversineDistanceM([locationFrom.latitude, locationFrom.longitude],
      [locationTo.latitude, locationTo.longitude]);
    distanceM += subDistanceM;
  }
  
  if (distanceM > 0) {
    $('#distance').val(`${ distanceM.toFixed(2) } m (${ metersToFt(distanceM).toFixed(2) } ft)`);
  } else {
    $('#distance').val('');
  }
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function haversineDistanceM(coordinate1, coordinate2) {
  const earthRadiusKm = 6371;
  const lat1 = coordinate1[0], lon1 = coordinate1[1];
  const lat2 = coordinate2[0], lon2 = coordinate2[1];
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c * 1_000;
}

function metersToFt(meters) {
  return meters * 3.28084;
}
