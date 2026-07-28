import { getCliClient } from 'sanity/cli'
import { randomUUID } from 'crypto'

const client = getCliClient({ apiVersion: '2023-01-01' })

function createSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const taxonomySource = {
  "Fine Art": {
    "Paintings": ["Oil Paintings", "Watercolors", "Acrylics", "Mixed Media", "Fresco", "Gouache", "Encaustic"],
    "Sculptures": ["Bronze Sculptures", "Marble Sculptures", "Wood Carvings", "Stone Sculptures", "Metalwork", "Ceramic Sculptures", "Glass Sculptures"],
    "Photography": ["Black & White", "Color Photography", "Daguerreotypes", "Polaroids", "Digital Prints", "Lithographs", "Cyanotypes"],
    "Drawings": ["Charcoal", "Graphite", "Pastel", "Ink", "Chalk", "Silverpoint", "Crayon"],
    "Prints": ["Etchings", "Screenprints", "Woodcuts", "Lithographs", "Engravings", "Monotypes", "Linocuts"],
    "Digital Art": ["NFTs", "Generative Art", "Digital Paintings", "3D Models", "Vector Art", "Pixel Art", "Animations"],
    "Textile Art": ["Tapestries", "Quilts", "Embroidery", "Weaving", "Batik", "Macrame", "Applique"],
    "Installations": ["Light Art", "Kinetic Sculpture", "Sound Art", "Site-Specific", "Interactive", "Video Art", "Environmental"]
  },
  "Vintage Watches": {
    "Wristwatches": ["Dress Watches", "Dive Watches", "Chronographs", "Aviation Watches", "Field Watches", "Racing Watches", "GMT Watches"],
    "Pocket Watches": ["Hunter Case", "Open Face", "Demi-Hunter", "Pair Case", "Railroad", "Musical", "Automata"],
    "Complications": ["Tourbillons", "Perpetual Calendars", "Minute Repeaters", "Moonphase", "Split-Seconds", "Power Reserve", "Alarm"],
    "Brands (Swiss)": ["Rolex", "Patek Philippe", "Audemars Piguet", "Vacheron Constantin", "Omega", "Breguet", "Jaeger-LeCoultre"],
    "Brands (Global)": ["A. Lange & Söhne", "Grand Seiko", "Cartier", "Panerai", "Nomos", "Sinn", "Casio"],
    "Eras": ["Pre-WWII", "1950s", "1960s", "1970s", "1980s", "1990s", "Modern"],
    "Materials": ["Stainless Steel", "Yellow Gold", "White Gold", "Rose Gold", "Platinum", "Titanium", "Ceramic"],
    "Movements": ["Manual Wind", "Automatic", "Quartz", "Spring Drive", "Tuning Fork", "Kinetic", "Solar"]
  },
  "Numismatics": {
    "US Coins": ["Pennies", "Nickels", "Dimes", "Quarters", "Half Dollars", "Silver Dollars", "Gold Eagles"],
    "World Coins": ["British Coins", "Canadian Coins", "Mexican Coins", "Australian Coins", "Chinese Coins", "European Coins", "African Coins"],
    "Ancient Coins": ["Roman Coins", "Greek Coins", "Byzantine Coins", "Celtic Coins", "Persian Coins", "Judean Coins", "Indian Coins"],
    "Paper Money": ["US Banknotes", "Confederate Currency", "World Paper Money", "Obsolete Banknotes", "Military Currency", "Fractional Currency", "Error Notes"],
    "Bullion": ["Gold Bullion", "Silver Bullion", "Platinum Bullion", "Palladium Bullion", "Rounds", "Bars", "Ingots"],
    "Commemoratives": ["Early US Commemoratives", "Modern US Commemoratives", "World Commemoratives", "Silver Proofs", "Gold Proofs", "Bimetallic", "Colorized"],
    "Errors & Varieties": ["Double Dies", "Off-Center Strikes", "Clipped Planchets", "Overdates", "Repunched Mintmarks", "Blank Planchets", "Die Cracks"],
    "Tokens & Medals": ["Hard Times Tokens", "Civil War Tokens", "Transportation Tokens", "Trade Tokens", "Presidential Medals", "Military Medals", "Exposition Medals"]
  },
  "Philately": {
    "US Stamps": ["19th Century", "Early 20th Century", "Modern", "Airmail", "Special Delivery", "Postage Due", "Officials"],
    "European Stamps": ["Great Britain", "Germany", "France", "Italy", "Russia", "Spain", "Switzerland"],
    "Asian Stamps": ["China", "Japan", "India", "Hong Kong", "Macau", "Singapore", "Taiwan"],
    "British Commonwealth": ["Australia", "Canada", "New Zealand", "South Africa", "Bermuda", "Falkland Islands", "Cyprus"],
    "Covers": ["First Day Covers", "Flight Covers", "Censored Covers", "Patriotic Covers", "Naval Covers", "Zeppelin Covers", "Mourning Covers"],
    "Specialties": ["Revenue Stamps", "Telegraph Stamps", "Local Posts", "Duck Stamps", "Test Stamps", "Specimen Stamps", "Booklets"],
    "Conditions": ["Mint Never Hinged", "Mint Hinged", "Used", "Used on Piece", "Cancelled to Order", "No Gum", "Regummed"],
    "Errors": ["Inverts", "Missing Colors", "Imperforates", "Color Shifts", "Double Impressions", "Missing Phosphor", "Freaks"]
  },
  "Antique Furniture": {
    "Seating": ["Chairs", "Sofas", "Benches", "Stools", "Chaise Lounges", "Settees", "Fauteuils"],
    "Tables": ["Dining Tables", "Coffee Tables", "Side Tables", "Console Tables", "Desks", "Card Tables", "Tea Tables"],
    "Storage": ["Cabinets", "Chests", "Dressers", "Bookcases", "Armoires", "Sideboards", "Credenzas"],
    "Beds": ["Four Poster", "Canopy", "Sleigh", "Daybeds", "Headboards", "Trundle", "Tester Beds"],
    "Eras (European)": ["Renaissance", "Baroque", "Rococo", "Neoclassical", "Victorian", "Art Nouveau", "Art Deco"],
    "Eras (American)": ["Colonial", "Federal", "Empire", "Shaker", "Mission", "Mid-Century Modern", "Postmodern"],
    "Materials": ["Mahogany", "Oak", "Walnut", "Cherry", "Rosewood", "Pine", "Teak"],
    "Accents": ["Mirrors", "Clocks", "Screens", "Pedestals", "Stands", "Trunks", "Coat Racks"]
  },
  "Classic Cars": {
    "Pre-War Classics": ["Brass Era", "Antique", "Vintage", "Classic", "Art Deco", "Coachbuilt", "Roadsters"],
    "Post-War Classics": ["1950s Cruisers", "Finned Cars", "European Sports", "Microcars", "Station Wagons", "Convertibles", "Grand Tourers"],
    "Muscle Cars": ["Pony Cars", "Big Blocks", "Small Blocks", "Mopar", "GM Muscle", "Ford Muscle", "Shelby"],
    "Exotics & Supercars": ["Italian Exotics", "British Exotics", "German Exotics", "Hypercars", "Track Cars", "Homologation Specials", "V12s"],
    "Race Cars": ["Formula 1", "Endurance", "Rally", "Nascar", "Drag Racing", "Touring Cars", "Vintage Racing"],
    "Off-Road & 4x4": ["Early Broncos", "Land Cruisers", "Defenders", "Scouts", "Jeeps", "G-Wagons", "Vintage Trucks"],
    "Conditions": ["Concours", "Restored", "Survivor", "Restomod", "Driver", "Project", "Barn Find"],
    "Origins": ["American", "British", "Italian", "German", "French", "Japanese", "Swedish"]
  },
  "Rare Books": {
    "First Editions": ["Fiction", "Non-Fiction", "Poetry", "Plays", "Children's", "Sci-Fi & Fantasy", "Mystery"],
    "Antiquarian": ["Pre-1500 (Incunabula)", "16th Century", "17th Century", "18th Century", "19th Century", "Vellum Bound", "Leather Bound"],
    "Signed Copies": ["Author Signed", "Inscribed", "Association Copies", "Illustrator Signed", "Limited Editions", "Numbered Copies", "Presentation Copies"],
    "Manuscripts": ["Illuminated", "Historical Documents", "Letters", "Diaries", "Musical Scores", "Scientific Papers", "Literary Drafts"],
    "Subjects": ["History", "Science & Medicine", "Religion & Theology", "Travel & Exploration", "Art & Architecture", "Philosophy", "Law"],
    "Bindings": ["Fine Bindings", "Publisher's Cloth", "Morocco", "Calf", "Pigskin", "Paper Wrappers", "Jeweled Bindings"],
    "Illustrated": ["Color Plates", "Woodcuts", "Engravings", "Lithographs", "Photographically Illustrated", "Livres d'Artiste", "Botanical"],
    "Ephemera": ["Broadsides", "Pamphlets", "Playbills", "Maps", "Posters", "Trade Cards", "Menus"]
  },
  "Jewelry & Gemstones": {
    "Rings": ["Engagement", "Wedding Bands", "Cocktail Rings", "Signet Rings", "Eternity Bands", "Halo Rings", "Solitaire Rings"],
    "Necklaces": ["Pendants", "Chokers", "Rivière", "Lariats", "Sautoirs", "Collars", "Strands"],
    "Bracelets": ["Bangles", "Tennis Bracelets", "Cuffs", "Charm Bracelets", "Link Bracelets", "Line Bracelets", "Wrap Bracelets"],
    "Earrings": ["Studs", "Hoops", "Drops", "Chandeliers", "Huggies", "Climbers", "Jackets"],
    "Brooches & Pins": ["Cameos", "Enamel", "Floral", "Animal", "Art Deco", "Victorian", "Edwardian"],
    "Diamonds": ["White Diamonds", "Colored Diamonds", "Round Brilliant", "Princess Cut", "Emerald Cut", "Old European Cut", "Rose Cut"],
    "Colored Gemstones": ["Rubies", "Sapphires", "Emeralds", "Pearls", "Opals", "Tourmalines", "Aquamarines"],
    "Eras": ["Georgian", "Victorian", "Edwardian", "Art Nouveau", "Art Deco", "Retro", "Contemporary"]
  },
  "Fine Wine": {
    "Red Wine": ["Bordeaux", "Burgundy", "Cabernet Sauvignon", "Pinot Noir", "Syrah/Shiraz", "Nebbiolo", "Sangiovese"],
    "White Wine": ["Chardonnay", "Sauvignon Blanc", "Riesling", "Chenin Blanc", "White Burgundy", "Grüner Veltliner", "Viognier"],
    "Champagne & Sparkling": ["Vintage Champagne", "Non-Vintage", "Blanc de Blancs", "Blanc de Noirs", "Rosé Champagne", "Prestige Cuvée", "Franciacorta"],
    "Whiskey & Bourbon": ["Single Malt Scotch", "Blended Scotch", "Kentucky Bourbon", "Rye Whiskey", "Japanese Whisky", "Irish Whiskey", "Tennessee Whiskey"],
    "Cognac & Armagnac": ["VSOP", "XO", "Hors d'Age", "Vintage Cognac", "Vintage Armagnac", "Fine Champagne", "Grande Champagne"],
    "Other Spirits": ["Rum", "Tequila", "Mezcal", "Gin", "Vodka", "Liqueurs", "Absinthe"],
    "Vintages": ["Pre-1970", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"],
    "Formats": ["Half Bottles", "Standard (750ml)", "Magnum (1.5L)", "Double Magnum", "Jeroboam", "Methuselah", "Balthazar"]
  },
  "Sports Memorabilia": {
    "Baseball": ["Game-Used Bats", "Game-Worn Jerseys", "Signed Baseballs", "Tickets", "Programs", "Pennants", "Photographs"],
    "Basketball": ["Game-Worn Sneakers", "Game-Worn Jerseys", "Signed Basketballs", "Championship Rings", "Tickets", "Floor Pieces", "Programs"],
    "Football": ["Game-Worn Helmets", "Game-Worn Jerseys", "Signed Footballs", "Super Bowl Rings", "Tickets", "Programs", "Cleats"],
    "Soccer (Football)": ["Match-Worn Shirts", "Signed Boots", "Signed Balls", "Medals", "Tickets", "Programs", "Pennants"],
    "Motorsport": ["Helmets", "Race Suits", "Car Parts", "Signed Photos", "Trophies", "Programs", "Tickets"],
    "Other Sports": ["Golf", "Tennis", "Boxing", "Hockey", "Olympics", "Cycling", "Cricket"],
    "Trading Cards": ["Vintage (Pre-1980)", "Modern (1980-Present)", "Rookie Cards", "Autographed Cards", "Relic/Patch Cards", "Graded Cards", "Unopened Wax"],
    "Autographs": ["Hall of Famers", "Active Stars", "Deceased Legends", "Team Signed", "Multi-Signed", "Cuts", "Documents"]
  },
  "Comic Books": {
    "Golden Age (1938-1956)": ["Action Comics", "Detective Comics", "Marvel Comics", "Timely", "Fawcett", "EC Comics", "Fiction House"],
    "Silver Age (1956-1970)": ["Amazing Spider-Man", "Fantastic Four", "X-Men", "Avengers", "Justice League", "Flash", "Showcase"],
    "Bronze Age (1970-1985)": ["Giant-Size X-Men", "Incredible Hulk", "Daredevil", "Batman", "Ghost Rider", "Tomb of Dracula", "Conan"],
    "Copper/Modern Age": ["Teenage Mutant Ninja Turtles", "Spawn", "Venom", "Harley Quinn", "Walking Dead", "Invincible", "Miles Morales"],
    "Key Issues": ["First Appearances", "Origin Stories", "Classic Covers", "Deaths", "Weddings", "Milestone Issues", "Variant Covers"],
    "Publishers": ["Marvel", "DC", "Image", "Dark Horse", "IDW", "Valiant", "Dynamite"],
    "Grading": ["CGC 9.8", "CGC 9.0-9.6", "CGC Mid-Grade", "CGC Low-Grade", "CBCS", "PGX", "Raw/Ungraded"],
    "Original Art": ["Cover Art", "Splash Pages", "Panel Pages", "Sketches", "Color Guides", "Storyboards", "Animation Cels"]
  },
  "Historical Artifacts": {
    "Ancient Civilizations": ["Egyptian", "Greek", "Roman", "Mesopotamian", "Persian", "Minoan", "Etruscan"],
    "Medieval & Renaissance": ["Arms & Armor", "Manuscripts", "Religious Artifacts", "Jewelry", "Coins", "Tools", "Pottery"],
    "Maritime & Nautical": ["Ship Models", "Navigational Instruments", "Scrimshaw", "Shipwrecks", "Logbooks", "Telescopes", "Cannons"],
    "Scientific & Medical": ["Astrolabes", "Microscopes", "Globes", "Surgical Instruments", "Apothecary", "Clocks", "Barometers"],
    "Exploration": ["Polar Exploration", "Space Exploration", "Aviation", "Maps", "Journals", "Photographs", "Equipment"],
    "Political & Presidential": ["Campaign Buttons", "Signatures", "Documents", "White House Artifacts", "Posters", "Flags", "Ribbons"],
    "Industrial Revolution": ["Steam Engines", "Telegraphs", "Early Telephones", "Typewriters", "Sewing Machines", "Tools", "Blueprints"],
    "Pre-Columbian": ["Mayan", "Aztec", "Incan", "Olmec", "Nazca", "Moche", "Taino"]
  },
  "Musical Instruments": {
    "Guitars (Electric)": ["Fender Stratocaster", "Fender Telecaster", "Gibson Les Paul", "Gibson SG", "PRS", "Rickenbacker", "Gretsch"],
    "Guitars (Acoustic)": ["Martin", "Taylor", "Gibson Acoustic", "Guild", "Classical", "Flamenco", "Resonator"],
    "Basses": ["Precision Bass", "Jazz Bass", "Rickenbacker Bass", "Stingray", "Acoustic Bass", "Fretless", "Upright Bass"],
    "Amplifiers & Effects": ["Vintage Tube Amps", "Boutique Amps", "Vintage Pedals", "Tape Echoes", "Fuzz Pedals", "Wah Pedals", "Synthesizers"],
    "Bowed Strings": ["Violins", "Violas", "Cellos", "Double Basses", "Bows", "Baroque Instruments", "Violas da Gamba"],
    "Keyboards & Pianos": ["Grand Pianos", "Upright Pianos", "Hammond Organs", "Rhodes", "Wurlitzer", "Clavinet", "Harpsichords"],
    "Wind & Brass": ["Saxophones", "Trumpets", "Trombones", "Flutes", "Clarinets", "Tubas", "French Horns"],
    "Percussion": ["Drum Kits", "Snares", "Cymbals", "Congas", "Timbales", "Vibraphones", "Marimbas"]
  },
  "Memorabilia & Autographs": {
    "Music Memorabilia": ["Concert Posters", "Stage Worn Clothing", "Signed Instruments", "Setlists", "Vinyl Records", "Tickets", "Backstage Passes"],
    "Movie & TV Props": ["Screen Used Props", "Wardrobe", "Scripts", "Storyboards", "Concept Art", "Clapperboards", "Production Notes"],
    "Hollywood Autographs": ["Classic Hollywood", "Modern Actors", "Directors", "Signed Photos", "Signed Contracts", "Letters", "Cuts"],
    "Music Autographs": ["Rock & Roll", "Pop", "Jazz", "Classical", "Hip Hop", "Country", "R&B"],
    "Historical Figures": ["Royalty", "Inventors", "Activists", "Military Leaders", "Writers", "Scientists", "Explorers"],
    "Animation & Anime": ["Production Cels", "Drawings", "Backgrounds", "Signed Art", "Limited Editions", "Model Sheets", "Scripts"],
    "Theme Parks": ["Disneyland/Disney World", "Ride Vehicles", "Signage", "Cast Member Items", "Maps", "Tickets", "Concept Art"],
    "Pop Culture": ["Action Figures", "Board Games", "Video Games", "Lunchboxes", "Advertising", "Toys", "Pinball Machines"]
  },
  "Antique Firearms & Militaria": {
    "Edged Weapons": ["Swords", "Daggers", "Bayonets", "Knives", "Polearms", "Axes", "Rapiers"],
    "Flintlock & Percussion": ["Muskets", "Rifles", "Pistols", "Blunderbusses", "Fowling Pieces", "Duelling Pistols", "Revolvers"],
    "Cartridge Firearms": ["Lever Action", "Bolt Action", "Single Shot", "Revolvers", "Semi-Automatic", "Derringers", "Shotguns"],
    "Uniforms & Headgear": ["Helmets", "Hats & Caps", "Tunics", "Trousers", "Boots", "Belts & Buckles", "Epaulettes"],
    "Medals & Orders": ["Gallantry", "Campaign", "Long Service", "Orders of Knighthood", "Miniature Medals", "Ribbons", "Badges"],
    "Field Equipment": ["Canteens", "Binoculars", "Compasses", "Backpacks", "Tents", "Medical Kits", "Rations"],
    "Conflicts (US)": ["Revolutionary War", "Civil War", "WWI", "WWII", "Korea", "Vietnam", "Indian Wars"],
    "Conflicts (Global)": ["Napoleonic Wars", "Crimean War", "Zulu War", "Boer War", "WWI (European)", "WWII (European/Pacific)", "Cold War"]
  }
}

// Generate taxonomy tree
function buildTaxonomyTree() {
  const root = {
    name: "Elite Collectibles",
    slug: "elite-collectibles",
    level: 1,
    children: [],
    sortOrder: 0
  }

  let l2Order = 10
  for (const [l2Name, l3Groups] of Object.entries(taxonomySource)) {
    const l2Node = {
      name: l2Name,
      slug: createSlug(l2Name),
      level: 2,
      children: [],
      sortOrder: l2Order
    }
    l2Order += 10
    root.children.push(l2Node)

    let l3Order = 10
    for (const [l3Name, l4Items] of Object.entries(l3Groups)) {
      const l3Node = {
        name: l3Name,
        slug: createSlug(`${l2Name} ${l3Name}`),
        level: 3,
        children: [],
        sortOrder: l3Order
      }
      l3Order += 10
      l2Node.children.push(l3Node)

      let l4Order = 10
      for (const l4Name of l4Items) {
        l3Node.children.push({
          name: l4Name,
          slug: createSlug(`${l2Name} ${l3Name} ${l4Name}`),
          level: 4,
          children: [],
          sortOrder: l4Order
        })
        l4Order += 10
      }
    }
  }

  return root
}

async function main() {
  const taxonomyTree = buildTaxonomyTree()
  console.log("Fetching existing categories from Sanity...")

  // Fetch all existing categories to build maps
  const existingCategories = await client.fetch(`*[_type == "category"]{
    _id, 
    name, 
    "slug": slug.current, 
    "parentId": parentCategory._ref,
    displayOrder
  }`)

  const docBySlug = new Map()
  const childrenByParentId = new Map()

  for (const cat of existingCategories) {
    if (cat.slug) docBySlug.set(cat.slug, cat)
    
    if (cat.parentId) {
      if (!childrenByParentId.has(cat.parentId)) {
        childrenByParentId.set(cat.parentId, [])
      }
      childrenByParentId.get(cat.parentId).push(cat)
    }
  }

  const report = {
    existingCategories: 0,
    existingChildrenFound: 0,
    newLevel3: 0,
    newLevel4: 0,
    newOther: 0,
    skippedDuplicates: 0,
    errors: 0,
    details: []
  }

  async function processNode(node, parentId, path) {
    try {
      let existingDoc = docBySlug.get(node.slug)

      // Fallback: Check if a category with the same name exists under the same parent
      if (!existingDoc && parentId) {
        const existingSiblings = childrenByParentId.get(parentId) || []
        const sameNameChild = existingSiblings.find(c => c.name === node.name)
        if (sameNameChild) {
          existingDoc = sameNameChild
        }
      }

      let currentId = null

      if (existingDoc) {
        report.existingCategories++
        report.skippedDuplicates++
        currentId = existingDoc._id
      } else {
        // Create new category
        const newDoc = {
          _type: 'category',
          _id: `cat-${randomUUID()}`,
          name: node.name,
          slug: { _type: 'slug', current: node.slug },
          description: `Discover our exclusive collection of ${node.name}.`,
          icon: 'diamond',
          featured: false,
          status: 'active',
          visibility: 'public',
          displayOrder: node.sortOrder || 0,
          seo: {
            _type: 'seo',
            metaTitle: `${node.name} - Elite Collectibles | ViaFinds`,
            metaDescription: `Explore our premium selection of ${node.name}. Curated for collectors.`,
            noIndex: false,
            noFollow: false
          }
        }

        if (parentId) {
          newDoc.parentCategory = { _type: 'reference', _ref: parentId }
        }

        const created = await client.createIfNotExists(newDoc)
        currentId = created._id
        
        // Update in-memory maps
        docBySlug.set(node.slug, created)
        if (parentId) {
          if (!childrenByParentId.has(parentId)) childrenByParentId.set(parentId, [])
          childrenByParentId.get(parentId).push(created)
        }

        if (node.level === 3) report.newLevel3++
        else if (node.level === 4) report.newLevel4++
        else report.newOther++
        
        console.log(`Created [L${node.level}] ${path}`)
      }

      // Process children recursively
      if (node.children && node.children.length > 0) {
        // Log existing children count for this parent
        const existingChildren = childrenByParentId.get(currentId) || []
        report.existingChildrenFound += existingChildren.length

        for (const child of node.children) {
          await processNode(child, currentId, path + ' > ' + child.name)
        }
      }

    } catch (err) {
      report.errors++
      report.details.push(`Error processing ${path}: ${err.message}`)
      console.error(`Error on ${path}:`, err.message)
    }
  }

  console.log("Starting recursive tree processing...")
  await processNode(taxonomyTree, null, taxonomyTree.name)

  console.log('\n=====================================')
  console.log('         TAXONOMY SYNC REPORT        ')
  console.log('=====================================')
  console.log(`Existing categories encountered: ${report.existingCategories}`)
  console.log(`Existing children read:          ${report.existingChildrenFound}`)
  console.log(`New Level 3 created:             ${report.newLevel3}`)
  console.log(`New Level 4 created:             ${report.newLevel4}`)
  console.log(`Other levels created (L1/L2):    ${report.newOther}`)
  console.log(`Skipped duplicates (Unchanged):  ${report.skippedDuplicates}`)
  console.log(`Errors Encountered:              ${report.errors}`)
  
  if (report.errors > 0) {
    console.log('\nError Details:')
    report.details.forEach(d => console.log(d))
  }
}

main().catch(err => {
  console.error('Fatal Script Error:', err)
  process.exit(1)
})
