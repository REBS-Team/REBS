module.exports = {
  data: {
    name: "fakeban",
    description: "Fake ban a user",
    "integration_types": [1],
    "contexts": [0, 1, 2],
    options: [
      {
        name: "user",
        description: "The user to fake ban",
        type: 6, // USER type
        required: true
      },
      {
        name: "reason",
        description: "The reason for the fake ban",
        type: 3, // STRING type
        required: false
      },
      {
        name: "duration",
        description: "Duration of the fake ban (in days)",
        type: 4, // INTEGER type
        required: false
      }
    ]
  },
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const duration = interaction.options.getInteger("duration") || 0;

    let durationText;
    if (duration === 0) {
      durationText = "Permanent Ban";
    } else {
      durationText = `${duration} days`;
    }

    const embed = {
      title: "Fake Ban",
      description: `**${user.username}** has been banned! ✅`,
      fields: [
        {
          name: "Reason",
          value: reason
        },
        {
          name: "Duration",
          value: durationText
        }
      ],
      color: 0x00FF00
    };

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};