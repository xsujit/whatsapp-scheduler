import { useActionState } from "react";
import "./App.css";

// 1. The Action Function (Runs when form submits)
async function scheduleMessageAction(previousState, formData) {
	const message = formData.get("message");

	// Basic validation
	if (!message || message.trim() === "") {
		return { error: "Please write a message first." };
	}

	try {
		// Send data to your Node.js Backend
		const response = await fetch("http://localhost:3001/api/schedule", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message }),
		});

		const data = await response.json();

		if (!data.success) {
			return { error: "Server Error: " + (data.error || "Unknown") };
		}

		return {
			success: data.success,
			message: data.message,
			scheduledFor: data.scheduledFor,
		};
	} catch (err) {
		return { error: "❌ Failed to connect. Is the Node server running?" + err };
	}
}

function App() {
	const [state, formAction, isPending] = useActionState(scheduleMessageAction, null);

	console.log('state', state);

	return (
		<div className="container">
			<div className="card">
				<h2>🌅 WhatsApp Morning Scheduler</h2>
				<p className="subtitle">Draft tonight, sleep tight.</p>

				<form action={formAction}>
					<div className="input-group">
						<label htmlFor="message">Message Draft</label>
						<textarea
							id="message"
							name="message"
							rows="6"
							placeholder="Good morning team! Here are the updates..."
							disabled={isPending}
						/>
					</div>

					<button type="submit" disabled={isPending} className="submit-btn">
						{isPending ? "Scheduling..." : "Schedule Message"}
					</button>
				</form>

				{state?.error && <div className="alert error">❌ {state.error}</div>}
				{state?.success && (
					<div className="alert success">
						<h4 className="schedule-header">{state.message}</h4>

						{state.scheduledFor?.length > 0 && (
							<ul className="schedule-list">
								{state.scheduledFor.map((item, index) => (
									<li key={index} className="schedule-item">
										<span className="chat-name">👥 {item.chat}</span>
										<span> at </span>
										<span className="time-highlight">{item.time}</span>
										<span className="timezone-display"> ({item.timezone})</span>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export default App;