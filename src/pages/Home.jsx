import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import axios from 'axios';
import { Header } from '../components/Header';
import { url } from '../const';
import './home.scss';

const TaskList = ({ tasks, selectListId, isDoneDisplay }) => {
  const calculateRemainingTime = (limitDate) => {
    const now = new Date();
    const limit = new Date(limitDate);
    const timeDiff = limit - now;

    if (timeDiff < 0) return "期限切れ";

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    let result = [];
    if (days > 0) result.push(`${days}日`);
    if (hours > 0) result.push(`${hours}時間`);
    if (minutes > 0) result.push(`${minutes}分`);

    return result.join(" ");
  };

  const filteredTasks = tasks.filter(task => 
    isDoneDisplay === 'done' ? task.done : !task.done
  );

  return (
    <ul>
      {filteredTasks.map((task) => (
        <li key={task.id} className="task-item">
          <Link to={`/lists/${selectListId}/tasks/${task.id}`} className="task-item-link">
            {task.title}<br />
            {task.done ? "完了" : "未完了"}<br />
            期日：{new Date(task.limit).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}<br />
            残り時間：{calculateRemainingTime(task.limit)}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export const Home = () => {
  const [isDoneDisplay, setIsDoneDisplay] = useState('todo');
  const [lists, setLists] = useState([]);
  const [selectListId, setSelectListId] = useState();
  const [focusedListId, setFocusedListId] = useState();
  const [tasks, setTasks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [cookies] = useCookies();
  const listTabRef = useRef(null);

  useEffect(() => {
    axios.get(`${url}/lists`, {
      headers: { authorization: `Bearer ${cookies.token}` },
    })
      .then(res => {
        setLists(res.data);
      })
      .catch(err => {
        setErrorMessage(`リストの取得に失敗しました。${err}`);
      });
  }, [cookies.token]);

  useEffect(() => {
    const listId = lists[0]?.id;
    if (typeof listId !== 'undefined') {
      setSelectListId(listId);
      setFocusedListId(listId);
      fetchTasks(listId);
    }
  }, [lists]);

  const fetchTasks = (listId) => {
    axios.get(`${url}/lists/${listId}/tasks`, {
      headers: { authorization: `Bearer ${cookies.token}` },
    })
      .then(res => {
        setTasks(res.data.tasks);
      })
      .catch(err => {
        setErrorMessage(`タスクの取得に失敗しました。${err}`);
      });
  };

  const handleSelectList = (id) => {
    setSelectListId(id);
    fetchTasks(id);
  };

  const handleListKeyDown = (e, listId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectList(listId);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const lists = Array.from(listTabRef.current.children);
      const currentIndex = lists.findIndex(list => list.getAttribute('data-list-id') === focusedListId);
      let newIndex;

      if (e.key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % lists.length;
      } else {
        newIndex = (currentIndex - 1 + lists.length) % lists.length;
      }

      const newListId = lists[newIndex].getAttribute('data-list-id');
      setFocusedListId(newListId);
      lists[newIndex].focus();
    }
  };

  const handleIsDoneDisplayChange = (e) => setIsDoneDisplay(e.target.value);

  return (
    <div>
      <Header />
      <main className="taskList">
        <p className="error-message">{errorMessage}</p>
        <div>
          <div className="list-header">
            <h2>リスト一覧</h2>
            <div className="list-menu">
              <p><Link to="/list/new">リスト新規作成</Link></p>
              <p><Link to={`/lists/${selectListId}/edit`}>選択中のリストを編集</Link></p>
            </div>
          </div>
          <div
            role="tablist"
            aria-label="タスクリスト"
            className="list-tab"
            ref={listTabRef}
          >
            {lists.map((list) => {
              const isActive = list.id === selectListId;
              const isFocused = list.id === focusedListId;
              return (
                <button
                  key={list.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`list-${list.id}-panel`}
                  id={`list-${list.id}-tab`}
                  className={`list-tab-item ${isActive ? "active" : ""} ${isFocused ? "focused" : ""}`}
                  onClick={() => handleSelectList(list.id)}
                  onKeyDown={(e) => handleListKeyDown(e, list.id)}
                  tabIndex={isFocused ? 0 : -1}
                  data-list-id={list.id}
                >
                  {list.title}
                </button>
              );
            })}
          </div>
          {lists.map((list) => (
            <div
              key={list.id}
              role="tabpanel"
              id={`list-${list.id}-panel`}
              aria-labelledby={`list-${list.id}-tab`}
              hidden={list.id !== selectListId}
            >
              <div className="tasks">
                <div className="tasks-header">
                  <h2>タスク一覧</h2>
                  <Link to="/task/new">タスク新規作成</Link>
                </div>
                <div className="display-select-wrapper">
                  <select
                    onChange={handleIsDoneDisplayChange}
                    className="display-select"
                    value={isDoneDisplay}
                  >
                    <option value="todo">未完了</option>
                    <option value="done">完了</option>
                  </select>
                </div>
                <TaskList tasks={tasks} selectListId={selectListId} isDoneDisplay={isDoneDisplay} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
