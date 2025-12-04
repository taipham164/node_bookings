/**
 * DatePickerHandler handles the action when a new date on the
 * calendar is selected - we show the available times for that date
 */
class DatePickerHandler {
  /**
   * Constructor for DatePickerHandler
   * @param {Availability[]} availabilities
   * @param {String} serviceId
   * @param {String} serviceVersion
   * @param {String} bookingId - booking id if rescheduling an existing booking. Else undefined
   * @param {String} businessTimeZone - the business IANA time zone
   */
  constructor(availabilities, serviceId, serviceVersion, bookingId, businessTimeZone) {
    this.availabilityMap = this.createDateAvailableTimesMap(availabilities, businessTimeZone);
    this.serviceId = serviceId;
    this.serviceVersion = serviceVersion;
    this.bookingId = bookingId;
    // show the available times for today's date
    const now = new Date();
    const today = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    this.selectNewDate(today);
  }

  /**
   * Return a mapping of the availabilities array
   * to enable easy lookup of available times for a date on the client side
   * @param {Availability[]} availabilities
   * @param {String} businessTimeZone IANA timezone of the business
   * @return {Object<String, Object[]>} map where keys are the dates and values are
   * objects that contain the time, the team member id available and
   * the date in RFC 3339 format
   * All dates & times returned are converted to the time zone passed in
   * (business time zone)
   *
   * Ex. If availabilities is:
   * [
      {
        startAt: "2021-11-26T13:00:00Z",
        locationId: "location-id",
        appointmentSegments: [
          {
            durationMinutes: 30,
            teamMemberId: "team-id-1",
            serviceVariationId: "service-id",
            serviceVariationVersion: 1234
          }
        ]
      },
      {
        startAt: "2021-11-26T21:00:00Z",
        locationId: "location-id",
        appointmentSegments: [
          {
            durationMinutes: 30,
            teamMemberId: "team-id-2",
            serviceVariationId: "service-id",
            serviceVariationVersion: 1234
          }
        ]
      },
      {
        startAt "2021-11-30T12:30:00Z",
        locationId: "location-id",
        appointmentSegments: [
          {
            durationMinutes: 30,
            teamMemberId: "team-id-2",
            serviceVariationId: "service-id",
            serviceVariationVersion: 1234
          }
        ]
      }
    ]
    Then the object returned is (if local timezone is UTC-7 hours):
    {
      "2021-11-26": [
        {
          date: "2021-11-26T13:00:00Z",
          teamMemberId: "team-id-1",
          time: "6:00 am"
        },
        {
          date: "2021-11-26T21:00:00Z",
          teamMemberId: "team-id-2",
          time: "2:00 pm"
        }
      ],
      "2021-11-30": [
        {
          date: "2021-11-30T12:30:00Z",
          teamMemberId: "team-id-2",
          time: "5:30 am"
        }
      ]
    }
  */
  createDateAvailableTimesMap(availabilities, businessTimeZone) {
    const dateAvailableTimesMap = {};
    availabilities.forEach((availability) => {
      // get start date
      const startAtDate = new Date(availability.startAt);
      
      // Convert to business timezone using proper timezone conversion
      // Create a date formatter for the business timezone
      const dateFormatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: businessTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: businessTimeZone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // Get the date in business timezone (YYYY-MM-DD format)
      const startDate = dateFormatter.format(startAtDate);
      
      // Get the time components in business timezone
      const timeString = timeFormatter.format(startAtDate);
      const [hours, minutes] = timeString.split(':').map(Number);
      
      // Create a proper Date object in business timezone for display formatting
      const businessTime = new Date(startAtDate);
      businessTime.setTime(startAtDate.getTime()); // Keep original time for proper conversion
      
      const availableTimes = dateAvailableTimesMap[startDate] || [];
      // add the available times as a value to the date
      availableTimes.push({
        date: availability.startAt, // keep date in same RFC 3339 format so it can be used in createBooking
        teamMemberId: availability.appointmentSegments[0].teamMemberId,
        time: this.formatToAmPmFromComponents(hours, minutes)
      });
      dateAvailableTimesMap[startDate] = availableTimes;
    });
    return dateAvailableTimesMap;
  }

  /**
   * Reformat time components to 12 hour am/pm format
   * @param {Number} hours - hours in 24-hour format
   * @param {Number} minutes - minutes
   * @return {String} time in 12 hour format with am/pm
   */
  formatToAmPmFromComponents(hours, minutes) {
    let ampm = hours >= 12 ? 'pm' : 'am';
    let displayHours = hours % 12;
    displayHours = displayHours ? displayHours : 12; // Handle midnight (0 hours)
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }

  /**
   * Reformat time to 12 hour am/pm format
   * @param {Date} date in business's time zone
   * @return {String} time in 12 hour format with am/pm
   */
  formatToAmPm(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle midnight (0 hours)
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  }

  /**
   * Format a date string (YYYY-MM-DD) for display
   * @param {String} dateStr date in format yyyy-mm-dd
   * @returns {String} formatted date string
   */
  formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const formatted = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return formatted;
  }

  /**
   * Find the next available date from the current selected date
   * @param {String} currentDate current selected date in format yyyy-mm-dd
   * @returns {String|null} next available date in format yyyy-mm-dd or null if none found
   */
  findNextAvailableDate(currentDate) {
    const availableDates = Object.keys(this.availabilityMap).sort();
    
    // Find dates after the current date by string comparison (since dates are in YYYY-MM-DD format)
    const futureDates = availableDates.filter(date => date > currentDate);
    
    const result = futureDates.length > 0 ? futureDates[0] : null;
    return result;
  }

  /**
   * Jump to next available date and update the datepicker
   * @param {String} currentDate current selected date in format yyyy-mm-dd
   */
  goToNextAvailable(currentDate) {
    const nextDate = this.findNextAvailableDate(currentDate);
    if (nextDate) {
      // Update the datepicker widget
      $("#datepicker").datepicker("setDate", nextDate);
      
      // Update the date title display
      const formattedDate = this.formatDateForDisplay(nextDate);
      const selectedDateText = document.getElementById('selected-date-text');
      if (selectedDateText) {
        selectedDateText.textContent = formattedDate;
      }
      const selectedDateDisplay = document.getElementById('selected-date-display');
      if (selectedDateDisplay) {
        selectedDateDisplay.classList.add('show');
      }
      
      // Trigger the date selection
      this.selectNewDate(nextDate);
    }
  }

  /**
   * Handler for when a date is selected on the datepicker widget
   * Show the available times for that date
   * @param {String} date ie. 2021-10-30
   */
  selectNewDate(date) {
    const availableTimesDiv = document.getElementById("available-times");
    // clear available times and reset it to the new available times for the date
    availableTimesDiv.innerHTML = "";
    const availabities = this.availabilityMap[date];
    if (!availabities) { // no available times for the date
      const noTimesContainer = document.createElement("div");
      noTimesContainer.className = "no-times-available-container";
      
      const noTimesAvailable = document.createElement("p");
      noTimesAvailable.className = "no-times-available-msg";
      noTimesAvailable.innerHTML = "There are no times available for this date.";
      
      // Check if there's a next available date
      const nextDate = this.findNextAvailableDate(date);
      if (nextDate) {
        const nextAvailableBtn = document.createElement("button");
        nextAvailableBtn.className = "btn-next-available";
        nextAvailableBtn.type = "button";
        nextAvailableBtn.innerHTML = `
          <i class="fas fa-arrow-right"></i>
          Go to Next Available
        `;
        nextAvailableBtn.onclick = () => this.goToNextAvailable(date);
        
        const nextDateFormatted = this.formatDateForDisplay(nextDate);
        
        const nextDateInfo = document.createElement("p");
        nextDateInfo.className = "next-date-info";
        nextDateInfo.innerHTML = `Next available: ${nextDateFormatted}`;
        
        noTimesContainer.appendChild(noTimesAvailable);
        noTimesContainer.appendChild(nextDateInfo);
        noTimesContainer.appendChild(nextAvailableBtn);
      } else {
        noTimesAvailable.innerHTML = "There are no times available for this date - please select a new date.";
        noTimesContainer.appendChild(noTimesAvailable);
      }
      
      availableTimesDiv.appendChild(noTimesContainer);
      return;
    }
    // for each available time create a new element that directs user to the next step in booking
    // or reschedules the booking if it's an existing booking
    availabities.forEach((availability) => {
      const form = document.createElement("form");
      form.action = this.bookingId ? `/booking/${this.bookingId}/reschedule?startAt=${availability.date}` : "/contact";
      form.method = this.bookingId ? "post" : "get";
      // create hidden parameters for GET contact action
      if (form.method === "get") {
        const queryParams = {
          serviceId: this.serviceId,
          staff: availability.teamMemberId,
          startAt: availability.date,
          version: this.serviceVersion || "",
        };
        Object.keys(queryParams).forEach(queryParam => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = queryParam;
          input.value = queryParams[queryParam];
          form.appendChild(input);
        });
      }
      const timeItem = document.createElement("button");
      timeItem.innerHTML = availability.time;
      timeItem.className = "available-time";
      timeItem.type = "submit";
      form.appendChild(timeItem);
      availableTimesDiv.appendChild(form);
    });
  }

  /**
   * Format date to yyyy-mm-dd format
   * @param {String} date
   * @returns {String}
   */
  formatDate(date) {
    const d = new Date(date);
    let month = "" + (d.getMonth() + 1);
    let day = "" + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) {
      month = "0" + month;
    }
    if (day.length < 2) {
      day = "0" + day;
    }

    return [ year, month, day ].join("-");
  }

  /**
   * Determines whether a date is selectable or not
   * @param {String} date
   * @returns {Boolean[]} where first item indicates whether the date is selectable
   */
  isSelectable(date) {
    const now = new Date();
    const today = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    const formattedDate = this.formatDate(date);
    // let date be selectable if there's availabilities for the date or if the date is today
    return [ this.availabilityMap[formattedDate] || formattedDate === today ];
  }
}
