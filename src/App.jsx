import { useState, useEffect } from 'react';
import './App.css';

function useFeatureFlag(flagKey) {
console.log('test');
  const [enabled, setEnabled] = useState(!!window.FeatureStudio?.flags?.[flagKey]);
  useEffect(() => {
    const handleFlags = () => setEnabled(!!window.FeatureStudio?.flags?.[flagKey]);
    window.addEventListener('feature-studio-flags-loaded', handleFlags);
    handleFlags();
    return () => window.removeEventListener('feature-studio-flags-loaded', handleFlags);
  }, [flagKey]);
  return enabled;
}

function RichTextEditor({ value, onChange }) {
  const formatText = (format) => {
    const textarea = document.getElementById('description-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let formattedText;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      case 'bullet':
        formattedText = `• ${selectedText}`;
        break;
      default:
        return;
    }

    onChange(textarea.value.replace(selectedText, formattedText));
  };

  return (
    <div>
      <div>
        <button onClick={() => formatText('bold')}>Bold</button>
        <button onClick={() => formatText('italic')}>Italic</button>
        <button onClick={() => formatText('underline')}>Underline</button>
        <button onClick={() => formatText('bullet')}>Bullet</button>
      </div>
      <textarea
        id="description-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a description (optional)"
      />
    </div>
  );
}

function App() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  function addTodo(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setTodos([
      { id: Date.now(), text: input.trim(), description: description.trim(), completed: false },
      ...todos,
    ]);
    setInput('');
    setDescription('');
  }

  function toggleTodo(id) {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }

  function deleteTodo(id) {
    setTodos(todos.filter(t => t.id !== id));
  }

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const totalCount = todos.length;
  const doneCount = todos.filter(t => t.completed).length;
  const activeCount = totalCount - doneCount;

  function downloadCSV() {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Todo Item,Description,Creation Date,Status\n' +
      todos.map(t => `${t.text},${t.description},${new Date(t.id).toLocaleString()},${t.completed ? 'Completed' : 'Active'}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'todos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Download complete!');
  }

  const copyButtonEnabled = useFeatureFlag('copy-button-for-tasks');
  const descriptionFieldEnabled = useFeatureFlag('task-description-field');
  const richTextEditorEnabled = useFeatureFlag('rich-text-editor-for-todo-item');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>✨ Todo App</h1>
        <p>Stay organized, get things done</p>
      </header>

      {/* Stats */}
      <div className="stats">
        <div className="stat-card">
          <div className="number">{totalCount}</div>
          <div className="label">Total</div>
        </div>
        <div className="stat-card">
          <div className="number">{activeCount}</div>
          <div className="label">Active</div>
        </div>
        <div className="stat-card">
          <div className="number">{doneCount}</div>
          <div className="label">Done</div>
        </div>
      </div>

      {/* Add Todo */}
      <form className="add-todo" onSubmit={addTodo}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
        {descriptionFieldEnabled && (
          richTextEditorEnabled ? (
            <RichTextEditor value={description} onChange={setDescription} />
          ) : (
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
            />
          )
        )}
        <button type="submit">Add</button>
        <button type="button" onClick={downloadCSV}>Download CSV</button>
      </form>

      {/* Filters */}
      <div className="filters">
        {['all', 'active', 'completed'].map(f => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Todo List */}
      {filteredTodos.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">{filter === 'completed' ? '🎯' : '📝'}</div>
          <p>
            {filter === 'completed'
              ? 'No completed tasks yet'
              : filter === 'active'
                ? 'All tasks done! 🎉'
                : 'Add your first todo above'}
          </p>
        </div>
      ) : (
        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li key={todo.id} className="todo-item">
              <div
                className={`checkbox ${todo.completed ? 'checked' : ''}`}
                onClick={() => toggleTodo(todo.id)}
              />
              <span className={`text ${todo.completed ? 'completed' : ''}`}>{todo.text}</span>
              {descriptionFieldEnabled && todo.description && (
                <span className="description">{todo.description.length > 100 ? `${todo.description.substring(0, 100)}...` : todo.description}</span>
              )}
              {copyButtonEnabled && (
                <button className="copy-btn" onClick={() => copyToClipboard(todo.text)}>📋</button>
              )}
              <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      {/* Footer with SDK badge */}
      <footer className="footer">
        <p>Powered by Feature Studio</p>
        <div className="sdk-badge">⚡ Feature Studio SDK Active</div>
      </footer>
    </div>
  );
}

export default App;