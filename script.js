// Alejandro Mozqueda
// 4/16/2024


const onChange = () => {

}

(function ($) {
  let CheckboxDropdown = function (element, onChange) {
    let _this = this;
    this.isOpen = false;
    this.onChange = onChange || function () {
    };
    this.$dropdownElement = $(element);
    this.$label = this.$dropdownElement.find('.dropdown-label');
    this.$input = this.$dropdownElement.find('[type="button"]');
    
    
    this.$label.on('click', function (e) {
      e.preventDefault();
      _this.toggleOpen();
    });
    
    this.$input.on('click', function (e) {
      // _this.onCheckBox();
    });
  };
  
  
  CheckboxDropdown.prototype.toggleOpen = function (forceOpen) {
    let _this = this;
    if (!this.isOpen || forceOpen) {
      this.isOpen = true;
      this.$dropdownElement.addClass('on');
      
      // Close dropdown when clicking outside
      $(document).on('click', function (e) {
        if (!$(e.target).closest('[data-control]').length) {
          _this.toggleOpen();
        }
      });
    } else {
      this.isOpen = false;
      this.$dropdownElement.removeClass('on');
      $(document).off('click');
    }
  };
  
  // Initialize checkbox dropdowns
  $('[data-control="checkbox-dropdown"]').each(function () {
    new CheckboxDropdown($(this), onChange);
  });
})(jQuery);

class Location {
  constructor(code, name, latitude, longitude) {
    this.code = code;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
  }
}

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

let markedLocations = {};
(async () => {
  const data = await initData();
  if (data) {
    data
      .slice(1)
      .forEach(location => {
        markedLocations[location[0]] = [false, new Location(...location)];
      });
  }
  await initMap();
})();

$('#header-button').click(function () {
  alert('Header clicked!');
});
$('#test-marker').click(async function () {
  await addMarker(["TM", "Test Marker", 39.53852, -119.81422]);
});
$('#input-place-1').on('input', async function () {
  const locationName = markedLocations[$(this).val()];
  $('#place-1-name').text(locationName);
});
const places1 = $('#places-1');
let i = 0;
console.log();
for (const location in markedLocations) {
  console.log(i);
  i++;
  // places1.append(`<option value="${markedLocations[location][1][0]}">${markedLocations[location][1][0]}</option>`);
}


let markers = [];
let map, anchor = { lat: 39.53852, lng: -119.81422 };

const initMap = async () => {
  const { Map } = await google.maps.importLibrary("maps");
  map = new Map($("#map")[0], { center: anchor, zoom: 18, mapId: "UNR_QUAD" });
};

const addMarker = async (location) => {
  if (markedLocations[location[0]] || !map) {
    return;
  }
  
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
      <div id="siteNotice">
      </div>
      <h1 id="firstHeading" class="firstHeading">${ location[1] }</h1>
      <div id="bodyContent">
          <p><b>Code </b>${ location[0] }</p>
      </div>
  </div>
`;
  
  const infoWindow = new google.maps.InfoWindow({
    content: contentString,
    maxWidth: 120,
    ariaLabel: location[0]
  });
  
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const marker = new AdvancedMarkerElement({
    map: map,
    position: { lat: location[2], lng: location[3] },
    title: location[0]
  });
  
  markers.push([marker, infoWindow]);
  
  marker.addListener("click", () => {
    infoWindow.open({
      anchor: marker,
      map
    });
  });
};

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function calculateHaversineDistance(coordinate1, coordinate2) {
  const earthRadiusKm = 6371;
  const lat1 = coordinate1[0], lon1 = coordinate1[1];
  const lat2 = coordinate2[0], lon2 = coordinate2[1];
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
