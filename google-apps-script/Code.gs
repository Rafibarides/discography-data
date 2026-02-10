/**
 * ============================================================
 *  Discography Database  -  Google Apps Script (Code.gs)
 * ============================================================
 *
 *  SETUP
 *  -----
 *  1.  Open your Google Sheet named "Discography"
 *  2.  Extensions  >  Apps Script
 *  3.  Paste this entire file into Code.gs
 *  4.  Also create a file called Seed.gs and paste the generated seed content there
 *  5.  Run  setupSheets()  (from the toolbar dropdown) to create all tabs with headers
 *  6.  Run  seedDatabase()  (defined in Seed.gs) to populate all data
 *  7.  Deploy  >  New deployment  >  Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *  8.  Copy the web-app URL into the React frontend settings
 *
 * ============================================================
 */

/* ------------------------------------------------------------------ */
/*  WEB APP ENDPOINT                                                   */
/* ------------------------------------------------------------------ */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
  var result;

  try {
    switch (action) {
      case 'getAll':
        result = getAllData();
        break;
      case 'getSheet':
        var sheetName = e.parameter.sheet;
        if (!sheetName) {
          result = { error: 'Missing sheet parameter' };
        } else {
          result = getSheetData(sheetName);
        }
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/*  DATA READING HELPERS                                               */
/* ------------------------------------------------------------------ */

var SHEET_NAMES = [
  'songs', 'releases', 'people', 'song_credits', 'credit_roles',
  'lyrics', 'song_stats', 'artwork', 'release_art', 'art_credits',
  'art_types', 'distributors', 'labels', 'lyric_categories', 'perspectives'
];

function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = {};

  SHEET_NAMES.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      data[name] = sheetToArray(sheet);
    } else {
      data[name] = [];
    }
  });

  return data;
}

function getSheetData(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) return { error: 'Sheet not found: ' + name };
  return sheetToArray(sheet);
}

function sheetToArray(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function (h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // skip fully empty rows
    var hasData = row.some(function (cell) { return cell !== '' && cell !== null && cell !== undefined; });
    if (!hasData) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j] : '';
    }
    rows.push(obj);
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  SHEET SETUP                                                        */
/* ------------------------------------------------------------------ */

var SCHEMAS = {
  'songs': [
    'song_id', 'title', 'release_id', 'release_date', 'year',
    'is_published', 'is_explicit', 'has_video',
    'lyrics_category_id', 'perspective_id',
    'distributor_id', 'upload_type', 'label_id',
    'duration_sec', 'bpm', 'key', 'title_length'
  ],
  'releases': [
    'release_id', 'title', 'release_type', 'release_date', 'year',
    'cover_art_id', 'is_published'
  ],
  'people': [
    'person_id', 'name'
  ],
  'song_credits': [
    'song_credit_id', 'song_id', 'person_id', 'credit_role_id', 'credit_detail'
  ],
  'credit_roles': [
    'credit_role_id', 'name', 'category'
  ],
  'lyrics': [
    'song_id', 'lyrics_text'
  ],
  'song_stats': [
    'song_id', 'word_count', 'unique_word_count', 'top_words_json',
    'featured_vocalist_count', 'has_featured_vocalist'
  ],
  'artwork': [
    'art_id', 'image_url', 'description', 'art_type_id', 'created_year'
  ],
  'release_art': [
    'release_id', 'art_id', 'is_primary'
  ],
  'art_credits': [
    'art_id', 'person_id', 'credit_role_id'
  ],
  'art_types': [
    'art_type_id', 'name'
  ],
  'distributors': [
    'distributor_id', 'name'
  ],
  'labels': [
    'label_id', 'name'
  ],
  'lyric_categories': [
    'lyrics_category_id', 'name'
  ],
  'perspectives': [
    'perspective_id', 'name'
  ]
};

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var orderedNames = Object.keys(SCHEMAS);

  orderedNames.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }

    var headers = SCHEMAS[name];

    // clear existing content first
    sheet.clear();

    // write headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // auto-resize columns
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
  });

  // remove default Sheet1 if it exists
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }

  SpreadsheetApp.flush();
  Logger.log('All sheets created successfully.');
}

/* ------------------------------------------------------------------ */
/*  HELPER: Write rows to a sheet (used by Seed.gs)                    */
/* ------------------------------------------------------------------ */

function writeRowsToSheet(sheetName, rows) {
  if (!rows || rows.length === 0) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Sheet not found: ' + sheetName);
    return;
  }

  var headers = SCHEMAS[sheetName];
  if (!headers) {
    Logger.log('No schema for: ' + sheetName);
    return;
  }

  var data = rows.map(function (row) {
    return headers.map(function (h) {
      return row[h] !== undefined ? row[h] : '';
    });
  });

  // write starting at row 2 (after headers)
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }

  Logger.log('Wrote ' + data.length + ' rows to ' + sheetName);
}
