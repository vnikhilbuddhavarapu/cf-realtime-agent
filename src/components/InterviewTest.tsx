import { useState } from 'react';

interface SessionData {
	sessionId: string;
	expiresAt: number;
}

interface RoleplayData {
	roleplayId: string;
	sessionId: string;
	scenario: string;
	persona: string;
}

interface MeetingData {
	meetingId: string;
	authToken: string;
	joinUrl: string;
}

export function InterviewTest() {
	const [session, setSession] = useState<SessionData | null>(null);
	const [roleplay, setRoleplay] = useState<RoleplayData | null>(null);
	const [meeting, setMeeting] = useState<MeetingData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [logs, setLogs] = useState<string[]>([]);

	const addLog = (message: string) => {
		setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
	};

	const handleCreateSession = async () => {
		setLoading(true);
		setError(null);
		try {
			addLog('Creating session...');
			const response = await fetch('/api/session', { method: 'POST' });
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to create session');
			}

			setSession(result.data);
			addLog(`Session created: ${result.data.sessionId}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			setError(message);
			addLog(`Error: ${message}`);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateRoleplay = async () => {
		if (!session) return;

		setLoading(true);
		setError(null);
		try {
			addLog('Creating roleplay...');
			const response = await fetch('/api/roleplay', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: session.sessionId,
					scenario: 'Technical Interview',
					persona: 'Senior Software Engineer',
				}),
			});
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to create roleplay');
			}

			setRoleplay(result.data);
			addLog(`Roleplay created: ${result.data.roleplayId}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			setError(message);
			addLog(`Error: ${message}`);
		} finally {
			setLoading(false);
		}
	};

	const handleStartMeeting = async () => {
		if (!roleplay) return;

		setLoading(true);
		setError(null);
		try {
			addLog('Starting meeting...');
			const response = await fetch('/api/meeting/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleplayId: roleplay.roleplayId }),
			});
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to start meeting');
			}

			setMeeting(result.data);
			addLog(`Meeting started: ${result.data.meetingId}`);
			addLog('AI agent is joining the meeting...');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			setError(message);
			addLog(`Error: ${message}`);
		} finally {
			setLoading(false);
		}
	};

	const handleEndMeeting = async () => {
		if (!roleplay) return;

		setLoading(true);
		setError(null);
		try {
			addLog('Ending meeting...');
			const response = await fetch('/api/meeting/end', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleplayId: roleplay.roleplayId }),
			});
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to end meeting');
			}

			addLog('Meeting ended successfully');
			setMeeting(null);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			setError(message);
			addLog(`Error: ${message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
			<h1>AI Interview Prep - Sprint 1 Test</h1>
			<p style={{ color: '#666' }}>
				Testing RealtimeKit integration with Durable Objects
			</p>

			{error && (
				<div
					style={{
						padding: '10px',
						background: '#fee',
						border: '1px solid #fcc',
						borderRadius: '4px',
						marginBottom: '20px',
					}}
				>
					<strong>Error:</strong> {error}
				</div>
			)}

			<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
				<section>
					<h2>Step 1: Create Session</h2>
					<button
						onClick={handleCreateSession}
						disabled={loading || !!session}
						style={{
							padding: '10px 20px',
							background: session ? '#ccc' : '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: session ? 'not-allowed' : 'pointer',
						}}
					>
						{session ? '✓ Session Created' : 'Create Session'}
					</button>
					{session && (
						<div style={{ marginTop: '10px', fontSize: '14px' }}>
							<strong>Session ID:</strong> {session.sessionId}
							<br />
							<strong>Expires:</strong> {new Date(session.expiresAt).toLocaleString()}
						</div>
					)}
				</section>

				<section>
					<h2>Step 2: Create Roleplay</h2>
					<button
						onClick={handleCreateRoleplay}
						disabled={loading || !session || !!roleplay}
						style={{
							padding: '10px 20px',
							background: !session || roleplay ? '#ccc' : '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: !session || roleplay ? 'not-allowed' : 'pointer',
						}}
					>
						{roleplay ? '✓ Roleplay Created' : 'Create Technical Interview Roleplay'}
					</button>
					{roleplay && (
						<div style={{ marginTop: '10px', fontSize: '14px' }}>
							<strong>Roleplay ID:</strong> {roleplay.roleplayId}
							<br />
							<strong>Scenario:</strong> {roleplay.scenario}
							<br />
							<strong>Persona:</strong> {roleplay.persona}
						</div>
					)}
				</section>

				<section>
					<h2>Step 3: Start Meeting</h2>
					<button
						onClick={handleStartMeeting}
						disabled={loading || !roleplay || !!meeting}
						style={{
							padding: '10px 20px',
							background: !roleplay || meeting ? '#ccc' : '#ffc107',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: !roleplay || meeting ? 'not-allowed' : 'pointer',
						}}
					>
						{meeting ? '✓ Meeting Active' : 'Start Meeting'}
					</button>
					{meeting && (
						<div style={{ marginTop: '10px', fontSize: '14px' }}>
							<strong>Meeting ID:</strong> {meeting.meetingId}
							<br />
							<a
								href={meeting.joinUrl}
								target="_blank"
								rel="noopener noreferrer"
								style={{
									display: 'inline-block',
									marginTop: '10px',
									padding: '8px 16px',
									background: '#17a2b8',
									color: 'white',
									textDecoration: 'none',
									borderRadius: '4px',
								}}
							>
								Join Meeting →
							</a>
						</div>
					)}
				</section>

				<section>
					<h2>Step 4: End Meeting</h2>
					<button
						onClick={handleEndMeeting}
						disabled={loading || !meeting}
						style={{
							padding: '10px 20px',
							background: !meeting ? '#ccc' : '#dc3545',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: !meeting ? 'not-allowed' : 'pointer',
						}}
					>
						End Meeting
					</button>
				</section>
			</div>

			<section style={{ marginTop: '40px' }}>
				<h2>Activity Log</h2>
				<div
					style={{
						background: '#f5f5f5',
						padding: '15px',
						borderRadius: '4px',
						maxHeight: '300px',
						overflowY: 'auto',
						fontFamily: 'monospace',
						fontSize: '12px',
					}}
				>
					{logs.length === 0 ? (
						<div style={{ color: '#999' }}>No activity yet...</div>
					) : (
						logs.map((log, index) => (
							<div key={index} style={{ marginBottom: '5px' }}>
								{log}
							</div>
						))
					)}
				</div>
			</section>
		</div>
	);
}
