const configuration = {
  token: process.env.DISCORD_TOKEN,
};

// Load discord.js to read info about the server
const Discord = require("discord.js");
const client = new Discord.Client();
client.login(configuration.token);
let firebase = require("firebase/app");

console.log("bot loaded");

// Globals
let guild;
let channel;
let test_channel;
let dashboardMessage = undefined;
let games = {};

// Config
const BOT_NAME = "The Zone";
const DASHBOARD_TITLE = "☢️ The Zone";
const TEST_CHANNEL = "bot-playground";
const DASHBOARD_CHANNEL = "find-your-game";
let gameSlots = 4;
let numTablesToShow = 6;

// Initial values
let initialGameIdString =
  "C2HQZ,8GDIZ,TMTKT,AW0UN,6OS59,4QUJ6,9Z1MS,Q30AB,FLGFN";

// Dashboard embed
function constructDashboardEmbed(games) {
  let embed = new Discord.MessageEmbed()
    .setTitle(DASHBOARD_TITLE)
    .setDescription("Find a game to join!")
    .setTimestamp()
    .setFooter("Join a game!", "https://play.thezonerpg.com/favicon-32x32.png")
    .setColor("#ffe36a");

  Object.values(games).forEach((game, i) => {
    if (i < numTablesToShow) {
      let playerCount =
        game.players === undefined ? 0 : Object.entries(game.players).length;

      // Player names
      let playerNames = "";
      if (playerCount > 0) {
        Object.values(game.players).forEach((player, playerIndex) => {
          let separator = playerIndex < playerCount - 1 ? ", " : "";
          return (playerNames += player.name + separator);
        });
      } else {
        playerNames = "Game empty";
      }

      let gameState;
      if (game.completed === true) {
        gameState = "🌀 Game Over";
      } else if (game.started === true) {
        gameState = "▶️ Game started";
      } else {
        gameState = "👋 Not started";
      }

      let strPlayerCount = playerCount + " of " + gameSlots + " slots";
      let strCta =
        playerCount >= gameSlots
          ? "Full"
          : "[__**Join!**__](https://play.thezonerpg.com/game/" +
            game.gameId +
            ")";

      let strTable =
        gameState +
        "\n" +
        strCta +
        "\n```" +
        strPlayerCount +
        "\n---------------\n" +
        "Operation\n" +
        game.operationName +
        "\n" +
        game.gameId +
        "```";

      let strStream = i === 0 ? " 🔴 STREAM" : "";

      embed.addField(`Table ${i + 1} ${strStream}`, strTable, true);
    }
  });
  return embed;
}

// Update dashboard in the channel
function updateDashboard() {
  // let channel = test_channel;
  let embed = constructDashboardEmbed(games);

  // Check if there is already a dashboard in the channel
  let dashboardMessage = undefined;
  channel.messages.fetch({ limit: 100 }).then((msgs) => {
    dashboardMessage = msgs.find(
      (msg) =>
        msg.author.bot &&
        msg.author.username === BOT_NAME &&
        msg.embeds?.[0]?.title === DASHBOARD_TITLE
    );

    if (dashboardMessage === undefined) {
      // No dashboard in this channel, create it
      channel.send(embed).then((message) => {
        dashboardMessage = message;
      });
    } else {
      // Update the existing dashboard
      dashboardMessage.edit(embed);
    }

    updateChatChannels();
  });
}

function updateChatChannels() {
  let numToWord = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
  ];

  let strLinkIntro = "Link to The Zone game for this table";
  let strUrl = `https://play.thezonerpg.com/game/`;

  Object.keys(games).forEach((gameId, i) => {
    // Find channels
    let chatChannel = guild.channels.cache.find(
      (channel) => channel.name === `table-${numToWord[i + 1]}-chat`
    );

    // Find the message with the game link
    // and edit the message
    if (chatChannel !== undefined) {
      chatChannel.setTopic(
        `Channel for a Zone Mission: 🔗 https://play.thezonerpg.com/game/${gameId}`
      );
      chatChannel.messages.fetch({ limit: 100 }).then((msgs) => {
        // Find the last message
        linkMsg = msgs.find((msg) => msg.content.includes(strLinkIntro));

        // Update it if it already exists
        let strMessageToPost =
          "**" + strLinkIntro + ": " + strUrl + gameId + "**";
        if (linkMsg !== undefined) {
          linkMsg.edit(strMessageToPost);
          linkMsg.pin();
        } else {
          chatChannel.send(strMessageToPost).then((message) => message.pin());
        }
      });
    }
  });
}

// Listen for updates from Firebase
function getInitialFirebaseData(gameIds) {
  let promises = [];
  gameIds.forEach((gameId) => {
    promises.push(
      firebase
        .database()
        .ref("games/" + gameId)
        .once("value")
    );
  });
  Promise.all(promises).then((callback) => {
    // Get all the data into the games object
    callback.forEach((snapshot) => {
      let game = snapshot.val();
      games[game.gameId] = game;
    });

    // Construct initial dashboard
    updateDashboard();

    // Bind Firebase for subsequent updates
    bindFirebase(Object.keys(games));
  });
}

// Listen for updates from Firebase
function bindFirebase(gameIds) {
  gameIds.forEach((gameId) => {
    firebase
      .database()
      .ref("games/" + gameId)
      .on("value", (snapshot) => {
        let game = snapshot.val();
        let prevGame = games[game.gameId];
        games[game.gameId] = game;

        // Get only the fields that we care about
        function filteredGame(game) {
          return {
            players: game.players,
            gameId: game.gameId,
            operationName: game.operationName,
            started: game.started,
            dateStarted: game.started,
            completed: game.completed,
            dateCompleted: game.completed,
          };
        }

        if (
          JSON.stringify(filteredGame(prevGame)) ==
          JSON.stringify(filteredGame(game))
        ) {
          // No change, don't update
          console.log("No change relevant to dashboard");
        } else {
          // Do it!
          console.log("Updating" + game.gameId);
          updateDashboard();
        }
      });
  });
}

// Listen for updates from Firebase
function unbindFirebase(gameIds) {
  gameIds.forEach((gameId) => {
    firebase
      .database()
      .ref("games/" + gameId)
      .off("value");
  });
}

function gameIdsStringToArray(str) {
  // example <@!832275827391332352> !game ATZ5R
  console.log("STRING", str);
  return str.replace(/ /g, "").split(",");
}

function getMessageArguments(str, codeword) {
  // codeword = something like "!dashboard"
  let argumentStr = str
    .slice(str.indexOf(codeword) + codeword.length + 1)
    .trim();

  if (argumentStr.length === 0) {
    return [];
  } else {
    return argumentStr.replace(/ /g, "").split(",");
  }
}

// Start
client.once("ready", () => {
  console.log("Ready!");

  // Get The Zone Discord Server
  guild = client.guilds.cache.get("813189039065792562");

  // Channels
  // Test Channel
  test_channel = guild.channels.cache.find(
    (channel) => channel.name === TEST_CHANNEL
  );
  // test_channel.send("Bot is awake! Hello there here! " + new Date().toString());

  // Actual channel
  channel = guild.channels.cache.find(
    (channel) => channel.name === DASHBOARD_CHANNEL
  );

  // let gameIdString = "C2HQZ,8GDIZ,SH4RT,AW0UN,6OS59,4QUJ6,9Z1MS,Q30AB,FLGFN";
  let gameIdArray = gameIdsStringToArray(initialGameIdString);
  getInitialFirebaseData(gameIdArray);

  updateDashboard();
});

client.on("message", (message) => {
  if (message.content.includes("!dashboard")) {
    let arrGameIds = getMessageArguments(message.content, "!dashboard");

    if (arrGameIds.length === 0) {
      // Update dashboard without changing anything
      updateDashboard();
    } else {
      // Change the set of games we are tracking
      unbindFirebase(Object.keys(games));
      games = {};
      getInitialFirebaseData(arrGameIds);
    }
  }
});
