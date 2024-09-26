const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class BlackJack extends Command {
  constructor(client) {
    super(client, {
      name: 'blackjack',
      category: 'Economy',
      description: 'Play a game of blackjack',
      examples: ['blackjack 100'],
      usage: 'blackjack <bet>',
      aliases: ['bj'],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const { Blackjack } = require('blackjack-n-deck');

    // array of all my card emojis in my private server
    // These are also inside the bots files to host yourself!
    const cards = {
      AH: '<:aH:740317914833616976>',
      AD: '<:aD:740317914405666898>',
      AS: '<:aS:740317914422313102>',
      AC: '<:aC:740317914237894751>',
      '2H': '<:2H:740317913852149880>',
      '2D': '<:2D:740317913650561047>',
      '2S': '<:2S:740317913973784636>',
      '2C': '<:2C:740317913776521338>',
      '3H': '<:3H:740317913906413608>',
      '3D': '<:3D:740317913948488305>',
      '3S': '<:3S:740317913503760457>',
      '3C': '<:3C:740317913650561051>',
      '4H': '<:4H:740317913885704212>',
      '4D': '<:4D:740317913436782633>',
      '4S': '<:4S:740317914011402280>',
      '4C': '<:4C:740317914216792195>',
      '5H': '<:5H:740318094722990191>',
      '5D': '<:5D:740317913843630160>',
      '5S': '<:5S:740317914279837828>',
      '5C': '<:5C:740317913814138912>',
      '6H': '<:6H:740317914661519370>',
      '6D': '<:6D:740317914158334133>',
      '6S': '<:6S:740317914594541689>',
      '6C': '<:6C:740317914611318894>',
      '7H': '<:7H:740317916901277787>',
      '7D': '<:7D:740317914569375855>',
      '7S': '<:7S:740317914472644630>',
      '7C': '<:7C:740317914611318935>',
      '8H': '<:8H:740318115895705710>',
      '8D': '<:8D:740317914665713726>',
      '8S': '<:8S:740317914313392130>',
      '8C': '<:8C:740317914577764562>',
      '9H': '<:9H:740317916729442385>',
      '9D': '<:9D:740317914338557984>',
      '9S': '<:9S:740317914695204924>',
      '9C': '<:9C:740317914447478887>',
      '1H': '<:10H:740317914489552918>',
      '1D': '<:10D:740317914627965008>',
      '1S': '<:10S:740317914422575175>',
      '1C': '<:10C:740694200059691079>',
      JH: '<:jH:740317914401341471>',
      JD: '<:jD:740317914342883440>',
      JS: '<:jS:740317914799931463>',
      JC: '<:jC:740317914539884614>',
      QH: '<:qH:740317914690748588>',
      QD: '<:qD:740317914313523273>',
      QS: '<:qS:740317914627834036>',
      QC: '<:qC:740317914619445319>',
      KH: '<:kH:740317914242089031>',
      KD: '<:kD:740317914900725802>',
      KS: '<:kS:740317914317586614>',
      KC: '<:kC:740317914590347335>',
      '?': '<:cardBack:740317913948618793>',
    };

    function getCards(t, bj) {
      if (t === 'player') {
        // player cards
        const obj = bj.player.cards;
        const obj2 = [];
        for (let i = 0; i < obj.length; i++) {
          const card = obj[i].name.slice(0, 1) + obj[i].suitname.slice(0, 1);
          obj2.push(cards[card]);
        }
        return obj2.toString().replace(/,/g, ' '); // return the string of emojis in string form
      } else {
        // dealer cards
        const obj = bj.dealer.cards;
        const obj2 = [];
        for (let i = 0; i < obj.length; i++) {
          const card = obj[i].name.slice(0, 1) + obj[i].suitname.slice(0, 1);
          obj2.push(cards[card]);
        }
        if (obj2.length < 2) obj2.push(cards['?']);
        return obj2.toString().replace(/,/g, ' '); // return the string of emojis in string form
      }
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const cashValue = await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`);
    const startBalance = BigInt((await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || 0);
    const cash = cashValue === undefined ? startBalance : BigInt(cashValue);

    const Arguments = args.join(' ').toLowerCase();

    const bet = parseInt(Arguments.replace(/[^0-9]/g, ''));
    if (bet === Infinity) {
      return this.client.util.errorEmbed(msg, "You can't bet infinity.", 'Invalid bet');
    }
    if (isNaN(bet)) return this.client.util.errorEmbed(msg, 'Bet amount must be a number', 'Invalid Bet');
    if (bet < 1) return this.client.util.errorEmbed(msg, `You can't bet less than ${currencySymbol}1`, 'Invalid Bet');
    if (BigInt(bet) > cash) {
      return this.client.util.errorEmbed(msg, "You can't bet more cash than you have", 'Invalid Bet');
    }

    const bj = new Blackjack(bet, 1);
    // this function is called every time something happens

    let win = false;
    let bust = false;
    let push = false;
    let blackjack = false;
    let gameOver = false;
    let color = msg.settings.embedColor;
    const successColor = msg.settings.embedSuccessColor;
    const errorColor = msg.settings.embedErrorColor;

    bj.event = (event) => {
      switch (event) {
        case 'hit':
          color = '#03A9F4';
          break;
        case 'win':
          win = true;
          gameOver = true;
          color = successColor;
          break;
        case 'bust':
          bust = true;
          gameOver = true;
          color = errorColor;
          break;
        case 'push':
          push = true;
          gameOver = true;
          break;
        case 'blackjack':
          blackjack = true;
          gameOver = true;
          color = successColor;
          break;
        default:
          break;
      }
    };

    bj.init();

    const playerCards = getCards('player', bj);
    const dealerCards = getCards('dealer', bj);

    if (blackjack) {
      const winAmount = BigInt(bj.bet);

      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`Result: You win ${currencySymbol}${winAmount.toLocaleString()}`)
        .setColor(color)
        .addFields([
          { name: '**Your Hand**', value: `${playerCards} \n\nScore: Blackjack`, inline: true },
          { name: '**Dealer Hand**', value: `${dealerCards} \n\nScore: ${bj.dealer.score}`, inline: true },
        ]);

      const newAmount = cash + winAmount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
      return msg.channel.send({ embeds: [embed] });
    }

    function cardEmbed(
      description = 'Type `hit` to draw another card, `stand` to pass, or `doubledown` to double down.',
    ) {
      const playerCards = getCards('player', bj);
      const dealerCards = getCards('dealer', bj);

      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
        .setDescription(description)
        .setColor(color)
        .addFields([
          { name: '**Your Hand**', value: `${playerCards} \n\nScore: ${bj.player.score}`, inline: true },
          { name: '**Dealer Hand**', value: `${dealerCards} \n\nScore: ${bj.dealer.score}`, inline: true },
        ]);

      return embed;
    }

    async function winCheck(selected) {
      if (selected === 'hit') {
        bj.hit();
      } else if (selected === 'stand') {
        bj.stand();
      } else if (selected === 'doubledown') {
        bj.doubleDown();
      }

      const amount = BigInt(bj.bet);
      if (win) {
        const newAmount = cash + amount;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

        let csAmount = currencySymbol + amount.toLocaleString();
        csAmount = csAmount.length > 1024 ? csAmount.slice(0, 1021) + '...' : csAmount;
        return cardEmbed(`Result: You win ${csAmount}`);
      } else if (blackjack) {
        const newAmount = cash + amount;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

        let csAmount = currencySymbol + amount.toLocaleString();
        csAmount = csAmount.length > 1024 ? csAmount.slice(0, 1021) + '...' : csAmount;
        return cardEmbed(`Result: BlackJack, you win ${csAmount}`);
      } else if (bust) {
        const newAmount = cash - amount;
        await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());

        let csAmount = currencySymbol + amount.toLocaleString();
        csAmount = csAmount.length > 1024 ? csAmount.slice(0, 1021) + '...' : csAmount;
        return cardEmbed(`Result: Bust, you lose ${csAmount}`);
      } else if (push) {
        return cardEmbed('Result: Push, money back');
      }

      return cardEmbed();
    }

    const hit = new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary);
    const stand = new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary);
    const doubledown = new ButtonBuilder()
      .setCustomId('doubledown')
      .setLabel('DoubleDown')
      .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(hit, stand, doubledown);

    const messageEmbed = await msg.channel.send({ embeds: [cardEmbed()], components: [row] });

    while (!gameOver) {
      const collected = await Promise.race([
        msg.channel
          .awaitMessages({
            filter: (m) =>
              m.author.id === msg.author.id && ['hit', 'stand', 'doubledown'].includes(m.content.toLowerCase()),
            max: 1,
            time: 60000,
          })
          .catch(() => {}),

        messageEmbed
          .awaitMessageComponent({
            time: 60_000,
          })
          .catch(() => {}),
      ]);

      if (!collected) gameOver = true;

      let selected;
      if (collected.customId) {
        selected = collected.customId;

        const interactionUser = collected.user;
        if (interactionUser.id !== msg.author.id) {
          await collected.reply({ content: `These buttons aren't for you!`, ephemeral: true }).catch(() => {});
          continue;
        }

        const embed = await winCheck(selected);
        if (gameOver) {
          row.components[0].setDisabled(true);
          row.components[1].setDisabled(true);
          row.components[2].setDisabled(true);
        }
        collected.update({ embeds: [embed], components: [row] });
      } else {
        selected = collected.first().content.toLowerCase();
        collected
          .first()
          .delete()
          .catch(() => {});

        const embed = await winCheck(selected);
        if (gameOver) {
          row.components[0].setDisabled(true);
          row.components[1].setDisabled(true);
          row.components[2].setDisabled(true);
        }
        messageEmbed.edit({ embeds: [embed], components: [row] });
      }
    }
  }
}

module.exports = BlackJack;
