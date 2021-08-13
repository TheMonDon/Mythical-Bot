const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const DiscordJS = require('discord.js');

class kill extends Command {
  constructor (client) {
    super(client, {
      name: 'kill',
      description: 'Kill the chosen user in a funny way.',
      usage: 'kill <user>',
      category: 'Fun',
      guildOnly: true
    });
  }

  async run (msg, text) {
    const member = msg.member;
    let mem;

    if (!text || text.length < 1) {
      return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}kill <user>`);
    } else {
      mem = getMember(msg, text.join(' '));
    }

    if (mem.id === msg.author.id) {
      return msg.channel.send('Please don\'t try to kill yourself :(');
    }

    const deaths = [
      `${mem.displayName} jumped off a building before ${member.displayName} could kill them. 🏛`,
      `${member.displayName} killed ${mem.displayName} with a pistol! 🔫`,
      `${member.displayName} hulk smashed ${mem.displayName} into pulp. 💥`,
      `${mem.displayName} died from eating a cactus. 🌵`,
      `${member.displayName} killed ${mem.displayName} by drowning them in a tub of hot chocolate. 🛁 🍫 `,
      `${member.displayName} killed ${mem.displayName} by turning back time and giving them a ticket to the Titanic. 🚢`,
      `${member.displayName} slipped some bleach into ${mem.displayName}'s drink. 🍹`,
      `${mem.displayName} dies due to ${member.displayName} mentioning them. 💬`,
      `${mem.displayName} died from kissing a rattlesnake. 🐍`,
      `${mem.displayName} died from not forwarding the chain mail recieved from ${member.displayName}. 📧`,
      `${member.displayName} was so swagged that ${mem.displayName} died due to it. #Swag`,
      `${mem.displayName} was charging their Samsung Galaxy Note 7... 📱`,
      `${mem.displayName} was found guilty and was executed.`,
      `${member.displayName} feeds toothpaste-filled Oreos to ${mem.displayName}, who was apparently allergic to flouride. 🍪`,
      `${member.displayName} rigged ${mem.displayName}'s elytra and they fell to their death. ☠`,
      `${member.displayName} gave ${mem.displayName} a ticket to Malaysia Airlines Flight 370... ✈`,
      `${mem.displayName} climbed a tree, fell down, and was eaten by a rabid bunny.`,
      `${mem.displayName} might have fallen down a well while looking for pennies...`,
      `🎵🎵 ${mem.displayName} got ran over by a reindeer 🎵🎵`,
      `${member.displayName} sawed ${mem.displayName} in half. 🔪`,
      `${member.displayName} flayed the skin off of ${mem.displayName}`,
      `${mem.displayName}'s head was crushed by ${member.displayName}'s tractor. 🚜`,
      `${member.displayName} dropped a piano on ${mem.displayName}.`,
      `${mem.displayName} failed at playing cut the rope...`,
      `${mem.displayName} was playing Where's My Water? while ${member.displayName} stole their real water. 🤽`,
      `${member.displayName} killed ${mem.displayName} with their kindness. ❤`,
      `${mem.displayName} was playing Russian roulette with six bullets in the clip.`, // thanks Owl
      `${member.displayName} threw a snowball at ${mem.displayName} but it was actually an ice ball and knocked their brains out.`,
      `${member.displayName} buried ${mem.displayName} alive.`,
      `${mem.displayName} died from drinking a 'concrete' mixer.`,
      `${member.displayName} coaxed ${mem.displayName} into being Mary Poppins with an umbrella off the Empire State Building`,
      `${mem.displayName} was turned into a hairless cat by an evil witch, and then ate by a fox, which in turn was ate by a bear.`,
      `${member.displayName} paid the joker to kill ${mem.displayName} in a fun way. #WorthIt`,
      `${mem.displayName} digged straight down while playing minecraft and fell into lava after mining some diamonds`,
      `${mem.displayName} died from magic`,
      `${mem.displayName} was turned into a fly by ${member.displayName} and was swatted to their death.`,
      `${member.displayName} "accidentally" threw their sword at ${mem.displayName}.`,
      `${mem.displayName} tried juggling swords...idiot.`,
      `${mem.displayName} was pecked to death by ${member.displayName}'s chicken :chicken:`,
      `${mem.displayName} died from embarassment by ${member.displayName}`,
      `${mem.displayName} tried recreating fast and furious with ${member.displayName}'s car and died.`
    ];

    const num = Math.round(Math.random() * (deaths.length - 1)) + 1;
    const embed = new DiscordJS.MessageEmbed()
      .setTitle(deaths[num])
      .setFooter(`Reply #${num}`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = kill;
