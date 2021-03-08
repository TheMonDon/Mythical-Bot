const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class Blackjack extends Command {
  constructor (client) {
    super(client, {
      name: 'blackjack',
      category: 'Economy',
      description: 'Play a game of blackjack',
      examples: ['blackjack 100'],
      aliases: ['bj'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const { Blackjack } = require('blackjack-n-deck');

    const p = msg.settings.prefix;

    const usage = `${p}blackjack <bet>`;
    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: \n${usage}`);
    let bet = args.join(' ');

    // array of all my card emojis in my private server
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
      '?': '<:cardBack:740317913948618793>'
    };

    const cs = db.get(`servers.${msg.guild.id}.economy.symbol`) || '$';
    const cash = db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`) || db.get(`servers.${msg.guild.id}.economy.startBalance`) || 0;

    bet = bet.replace(/,/g, '');
    bet = bet.replace(cs, '');
    bet = parseInt(bet);
    if (isNaN(bet)) {
      return msg.channel.send('Please enter a number for the bet.');
    }
    if (bet < 1) return msg.channel.send(`You can't bet less than ${cs}1.`);
    if (bet > cash) return msg.channel.send('You can\'t bet more cash than you have.');

    db.subtract(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Take the cash money bet

    let color = '#03A9F4';

    const bj = new Blackjack(bet, 1);
    // this function is called every time something happens

    let win = false;
    let bust = false;
    let push = false;
    let blackjack = false;
    bj.event = event => {
      switch (event) {
        case 'hit':
          color = '#03A9F4';
          break;
        case 'win':
          win = true;
          color = 'GREEN';
          break;
        case 'bust':
          bust = true;
          color = 'RED';
          break;
        case 'push':
          push = true;
          break;
        case 'blackjack':
          blackjack = true;
          color = 'GREEN';
          break;
      }
    };

    bj.init();
    let bet1;

    let pcards = getCards('player', bj);
    let dcards = getCards('dealer', bj);
    if (blackjack) {
      bet1 = bet * 1.5;

      const embed = new DiscordJS.MessageEmbed()
        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
        .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
        .setColor(color)
        .addField('**Your Hand**', `${pcards} \n\nScore: Blackjack`, true)
        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);

      bet = bet + bet1;
      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
      return msg.channel.send(embed);
    }
    const em = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .setDescription('Type `hit` to draw another card or `stand` to pass.')
      .setColor(color)
      .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
      .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
    const mEm = await msg.channel.send(em);

    // main hit/stand (1st time)
    return msg.channel.awaitMessages(m => m.author.id === msg.author.id && ['hit', 'stand'].includes(m.content.toLowerCase()), { max: 1, time: 60000 }).then(collected => {
      if (collected.first().content.toLowerCase() === 'hit') { // 1st time hit
        bj.hit();

        if (win) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);

          bet = bet * 2;
          db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
        } else if (blackjack) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);
          bet1 = bet * 1.5;

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);

          bet = bet + bet1;
          db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
        } else if (push) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription('Result: Push, money back')
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);

          db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
        } else if (bust) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription('Bust: you lose')
            .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);
        } else {
        // Continue playing (2nd round)
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription('Type `hit` to draw another card or `stand` to pass.')
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);
          return msg.channel.awaitMessages(m => m.author.id === msg.author.id && ['hit', 'stand'].includes(m.content.toLowerCase()), { max: 1, time: 60000 }).then(collected => {
            if (collected.first().content.toLowerCase() === 'hit') { // 2nd time hit
              bj.hit();
              if (win) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);

                bet = bet * 2;
                db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
              } else if (blackjack) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);
                bet1 = bet * 1.5;

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);

                bet = bet + bet1;
                db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
              } else if (push) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription('Result: Push, money back')
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);

                db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
              } else if (bust) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription('Bust: you lose')
                  .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);
              } else {
              // continue playing (3rd round)
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription('Type `hit` to draw another card or `stand` to pass.')
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);
                return msg.channel.awaitMessages(m => m.author.id === msg.author.id && ['hit', 'stand'].includes(m.content.toLowerCase()), { max: 1, time: 60000 }).then(collected => {
                  if (collected.first().content.toLowerCase() === 'hit') { // 3rd time hit
                    bj.hit();
                    if (win) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet * 2;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (blackjack) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);
                      bet1 = bet * 1.5;

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet + bet1;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (push) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Result: Push, money back')
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
                    } else if (bust) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Bust: you lose')
                        .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);
                    } // if 4th round needed it goes here for hit
                  } else if (collected.first().content.toLowerCase() === 'stand') { // 1st time hit, 1st time stand (2nd round)
                    bj.stand();
                    if (win) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet * 2;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (blackjack) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);
                      bet1 = bet * 1.5;

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet + bet1;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (push) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Result: Push, money back')
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
                    } else if (bust) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Bust: you lose')
                        .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);
                    }
                  }
                });
              }
            } else if (collected.first().content.toLowerCase() === 'stand') { // (2nd round) 1st time hit 1st time stand)
              bj.stand();
              if (win) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);

                bet = bet * 2;
                db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
              } else if (blackjack) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);
                bet1 = bet * 1.5;

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);

                bet = bet + bet1;
                db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
              } else if (push) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription('Result: Push, money back')
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);

                db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
              } else if (bust) {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription('Bust: you lose')
                  .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);
              } else {
                pcards = getCards('player', bj);
                dcards = getCards('dealer', bj);

                const embed = new DiscordJS.MessageEmbed()
                  .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                  .setDescription('Type `hit` to draw another card or `stand` to pass.')
                  .setColor(color)
                  .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                  .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                mEm.edit(embed);
                return msg.channel.awaitMessages(m => m.author.id === msg.author.id, { max: 1, time: 30000 }).then(collected => {
                  if (collected.first().content.toLowerCase() === 'hit') { // 2nd time hit
                    bj.hit();
                    if (win) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet * 2;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (blackjack) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);
                      bet1 = bet * 1.5;

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet + bet1;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (push) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Result: Push, money back')
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
                    } else if (bust) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Bust: you lose')
                        .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);
                    }
                  } else if (collected.first().content.toLowerCase() === 'stand') { // 2nd time stand
                    bj.hit();
                    if (win) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet * 2;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (blackjack) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);
                      bet1 = bet * 1.5;

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      bet = bet + bet1;
                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
                    } else if (push) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Result: Push, money back')
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);

                      db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
                    } else if (bust) {
                      pcards = getCards('player', bj);
                      dcards = getCards('dealer', bj);

                      const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
                        .setDescription('Bust: you lose')
                        .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
                        .setColor(color)
                        .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
                        .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
                      mEm.edit(embed);
                    }
                  }
                });
              }
            }
          });
        }
      } else if (collected.first().content.toLowerCase() === 'stand') { // 1st time stand
        bj.stand();

        if (win) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription(`Result: You win ${cs}${bet.toLocaleString()}`)
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);

          bet = bet * 2;
          db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
        } else if (blackjack) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);
          bet1 = bet * 1.5;

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription(`Result: You win ${cs}${bet1.toLocaleString()}`)
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);

          bet = bet + bet1;
          db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add the winning money
        } else if (push) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription('Result: Push, money back')
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);

          db.add(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, bet); // Add their original money back
        } else if (bust) {
          pcards = getCards('player', bj);
          dcards = getCards('dealer', bj);

          const embed = new DiscordJS.MessageEmbed()
            .setAuthor(msg.author.username, msg.author.displayAvatarURL())
            .setDescription('Bust: you lose')
            .setDescription(`Result: You lose ${cs}${bet.toLocaleString()}`)
            .setColor(color)
            .addField('**Your Hand**', `${pcards} \n\nScore: ${bj.player.score}`, true)
            .addField('**Dealer Hand**', `${dcards} \n\nScore: ${bj.dealer.score}`, true);
          mEm.edit(embed);
        }
      } else {
        return msg.channel.send('incorrect response'); // keep this until i figure out how to only use 'hit' or 'stand'
      }
    });

    function getCards (t, bj) {
      if (t === 'player') { // player cards
        const obj = bj.player.cards;
        const obj2 = [];
        for (let i = 0; i < obj.length; i++) {
          const card = obj[i].name.slice(0, 1) + obj[i].suitname.slice(0, 1);
          obj2.push(cards[card]);
        }
        return obj2.toString().replace(/,/g, ' '); // return the string of emojis in string form
      } else { // dealer cards
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
  }
};
