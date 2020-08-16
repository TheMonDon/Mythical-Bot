const Command = require('../../base/Command.js');

class Ping extends Command {
  constructor (client) {
    super(client, {
      name: 'purge',
      description: 'Latency and API response times.',
      usage: 'purge',
      category: 'Moderator',
      guildOnly: true,
    });
  }

  async run (msg, args, level) { // eslint-disable-line no-unused-vars
    const prefix = this.client.settings.get(msg.guild.id).prefix;
    const me = msg.guild.me;

    if (msg.member.permissions.has('MANAGE_MESSAGES')) {
      if (me.permissions.has('MANAGE_MESSAGES')) {
        msg.delete();
        if (!args || args.length < 1) {
          msg.channel.send(`Incorrect Usage: ${prefix}purge <2-100> (member) (channel)`);
        } else {
          const num = args[0];
          if (!isNaN(num)) {
            if (num < 101 && num > 1) {
              if (msg.mentions.channels.first() && msg.mentions.members.first()) {
                const chan = msg.mentions.channels.first();
                const mem = msg.mentions.members.first();
                chan.messages.fetch({
                  limit: num
                })
                  .then(function (messages) {
                    messages = messages.filter(function (element) {
                      return element.author === mem || element.member === mem;
                    }, this);
                    chan.bulkDelete(messages, true)
                      .then(msg1 => msg.channel.send(`<:YES:520531392422215690> Succesfully deleted ${msg1.size} messages from ${mem} in ${chan}`));
                  });
              } else if (msg.mentions.members.first()) {
                const mem = msg.mentions.members.first();
                msg.channel.messages.fetch({
                  limit: num
                })
                  .then(function (messages) {
                    messages = messages.filter(function (element) {
                      return element.author === mem || element.member === mem;
                    }, this);
                    msg.channel.bulkDelete(messages, true)
                      .then(msg1 => msg.channel.send(`<:YES:520531392422215690> Succesfully deleted ${msg1.size} messages from ${mem} in current channel. Self destructing in 5 seconds.`)
                        .then(msg2 => msg2.delete({timeout: 5000})))
                      .catch(err => msg.channel.send(`An error occured: ${err}`));
                  });
              } else if (msg.mentions.channels.first()) {
                const chan = msg.mentions.channels.first();
                chan.bulkDelete(num, true)
                  .then(messages => msg.channel.send(`<:YES:520531392422215690> Succesfully deleted ${messages.size} messages from ${chan}. Self destructing in 5 seconds.`)
                    .then(msg1 => msg1.delete({timeout: 5000})))
                  .catch(err => msg.channel.send(`An error has occured: ${err}`));
              } else {
                msg.channel.bulkDelete(num, true)
                  .then(messages => msg.channel.send(`<:YES:520531392422215690> Succesfully deleted ${messages.size} messages from current channel. Self destructing in 5 seconds!`)
                    .then(msg1 => msg1.delete({timeout: 5000})))
                  .catch(err => msg.channel.send(`An error has occured: ${err}`));
              }
            } else {
              msg.channel.send(`Incorrect Usage: ${prefix}purge <2-100> (member) (channel)`);
            }
          } else {
            msg.channel.send(`\`${num}\` is not a number, please input a valid number!`);
          }
        }
      } else {
        msg.channel.send(':x: You have **MANAGE_MESSAGES**, but the bot doesn\'t.');
      }
    } else {
      msg.channel.send(':x: You are lacking the **MANAGE_MESSAGES** permission!');
    }

  }
}

module.exports = Ping;
